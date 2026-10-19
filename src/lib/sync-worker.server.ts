// Background worker for the SMMGen queue (server-only).
// Bounded batches, single-flight lock, idempotent progress, rate-limit aware
// backoff, and a circuit breaker for terminal provider errors.
import { smmgen, mapProviderStatus, isRateLimit, RateLimitError, type SmmgenService } from "./smmgen.server";
import { isReactionService, reactionProviderId } from "./reaction-options";

const LOCK_NAME = "smmgen-worker";
const LOCK_SECONDS = 240;
const MAX_JOBS_PER_RUN = 8;
const MAX_ORDERS_PER_RECONCILE = 200; // spread over batched status calls
const STATUS_BATCH_SIZE = 100; // SMMGen multi-status batch
const MAX_STATUS_BATCHES = 2;
const MAX_ATTEMPTS = 3; // 3 tries, then the order is marked failed (never stuck pending); 429s don't count
const BALANCE_TTL_MS = 10 * 60_000;
const SERVICES_TTL_MS = 12 * 60 * 60_000;

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type CycleResult = {
  status: "ok" | "skipped" | "paused" | "error";
  detail: string;
  processed: number;
  failed: number;
  runId?: string | undefined;
};

// Terminal errors: retrying the same request cannot succeed.
function isBlockingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("invalid api key") ||
    m.includes("incorrect request") ||
    m.includes("not enough funds") ||
    m.includes("insufficient") ||
    m.includes("unauthor")
  );
}

// Exponential backoff (with jitter) for a queued job attempt.
function jobBackoffMs(attempts: number) {
  const base = Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 30 * 60_000);
  return base + Math.floor(Math.random() * 15_000);
}

export async function enqueueJob(kind: string, payload: Record<string, unknown> = {}, dedupeKey?: string) {
  const db = await admin();
  const { error } = await db.from("sync_jobs").insert({
    kind,
    payload: payload as never,
    dedupe_key: dedupeKey ?? null,
  });
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
}

// Re-queue orders that were paid for but never reached the provider (missed
// trigger, worker crash, exhausted attempts). Idempotent: skips orders that
// already have a live job.
async function sweepUnsentOrders(db: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - 90_000).toISOString();
  const { data: orders } = await db
    .from("orders")
    .select("id")
    .is("provider_order_id", null)
    .in("status", ["pending", "processing"])
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(25);

  let queued = 0;
  for (const o of orders ?? []) {
    const { data: live } = await db
      .from("sync_jobs")
      .select("id")
      .eq("kind", "submit_order")
      .in("status", ["queued", "running"])
      .contains("payload", { order_id: o.id } as never)
      .maybeSingle();
    if (live) continue;
    const { error } = await db.from("sync_jobs").insert({
      kind: "submit_order",
      payload: { order_id: o.id } as never,
      dedupe_key: null,
    });
    if (!error) queued += 1;
  }
  return queued;
}

export async function runSyncCycle(trigger: string): Promise<CycleResult> {
  const db = await admin();

  const { data: settings } = await db.from("provider_settings").select("*").limit(1).maybeSingle();
  if (!settings || !settings.api_key) {
    return { status: "skipped", detail: "Clé API SMMGen non configurée", processed: 0, failed: 0 };
  }

  // Global rate-limit cooldown: back off entirely until the window expires.
  const cooldown = settings.rate_limited_until ? Date.parse(settings.rate_limited_until) : 0;
  if (cooldown > Date.now()) {
    const secs = Math.ceil((cooldown - Date.now()) / 1000);
    return {
      status: "skipped",
      detail: `Fournisseur limité (429) — reprise dans ${secs}s`,
      processed: 0,
      failed: 0,
    };
  }

  const { data: locked } = await db.rpc("acquire_sync_lock", {
    _name: LOCK_NAME,
    _seconds: LOCK_SECONDS,
  });
  if (!locked) {
    return { status: "skipped", detail: "Une synchronisation est déjà en cours", processed: 0, failed: 0 };
  }

  const paused = settings.paused;
  const jobLimit = paused ? 1 : MAX_JOBS_PER_RUN; // paused => at most one probe item

  const { data: run } = await db
    .from("sync_runs")
    .insert({ kind: trigger, status: "running", detail: paused ? "probe (service en pause)" : "" })
    .select("id")
    .single();
  const runId = run?.id;

  const api = smmgen(settings.api_url, settings.api_key);
  let processed = 0;
  let failed = 0;
  const notes: string[] = [];
  let blocked = "";
  let rateLimited = false;

  try {
    if (!paused) {
      const swept = await sweepUnsentOrders(db);
      if (swept) notes.push(`${swept} commande(s) remise(s) en file`);
    }

    const { data: jobs } = await db
      .from("sync_jobs")
      .select("*")
      .eq("status", "queued")
      .lte("run_after", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(jobLimit);

    for (const job of jobs ?? []) {
      if (blocked || rateLimited) break;
      // Claim atomically: a concurrent worker loses the update and skips the job.
      const { data: claimed } = await db
        .from("sync_jobs")
        .update({ status: "running", attempts: job.attempts + 1 })
        .eq("id", job.id)
        .eq("status", "queued")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      try {
        const note = await handleJob(db, api, settings, job);
        notes.push(note);
        await db
          .from("sync_jobs")
          .update({ status: "done", processed_at: new Date().toISOString(), last_error: "" })
          .eq("id", job.id);
        processed += 1;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        const limited = isRateLimit(e);
        failed += 1;

        const attempts = job.attempts + 1;
        const giveUp = !limited && (attempts >= MAX_ATTEMPTS || isBlockingError(message));
        const delay = limited
          ? Math.max(e instanceof RateLimitError ? e.retryAfterMs : 60_000, 60_000)
          : jobBackoffMs(attempts);
        const nextRetry = new Date(Date.now() + delay).toISOString();

        await db
          .from("sync_jobs")
          .update({
            status: giveUp ? "failed" : "queued",
            // A 429 is not the job's fault: don't burn an attempt.
            ...(limited ? { attempts: job.attempts } : {}),
            last_error: message.slice(0, 500),
            run_after: nextRetry,
          })
          .eq("id", job.id);

        if (job.kind === "submit_order") {
          const orderId = (job.payload as { order_id?: string } | null)?.order_id;
          if (orderId) {
            await db
              .from("orders")
              .update({
                api_error: message.slice(0, 500),
                provider_error: message.slice(0, 500),
                retry_count: attempts,
                next_retry_at: giveUp ? null : nextRetry,
                // Keep the order pending until it is really sent.
                status: giveUp ? "failed" : "pending",
              })
              .eq("id", orderId);
          }
        }

        if (limited) {
          rateLimited = true;
          notes.push("⏳ limite de débit SMMGen atteinte — reprise automatique");
        } else if (isBlockingError(message)) {
          blocked = message;
        }
      }
    }

    if (!blocked && !rateLimited && !paused) {
      const r = await reconcileOrders(db, api);
      processed += r.updated;
      if (r.error) {
        failed += 1;
        if (isRateLimit(r.error)) rateLimited = true;
        else if (isBlockingError(r.error)) blocked = r.error;
        notes.push(`réconciliation: ${r.error}`);
      } else {
        notes.push(`réconciliation: ${r.checked} vérifiée(s), ${r.updated} corrigée(s)`);
      }
    }

    if (!blocked && !rateLimited && !paused) {
      const note = await refreshBalanceCache(db, api, settings);
      if (note) notes.push(note);
    }

    if (blocked) {
      await db
        .from("provider_settings")
        .update({ paused: true, pause_reason: blocked.slice(0, 300) })
        .eq("id", settings.id);
    } else if (paused && processed > 0) {
      await db.from("provider_settings").update({ paused: false, pause_reason: "" }).eq("id", settings.id);
      notes.push("reprise automatique après sonde réussie");
    }

    const status = blocked ? "error" : paused ? "paused" : "ok";
    if (runId) {
      await db
        .from("sync_runs")
        .update({
          status,
          items_processed: processed,
          items_failed: failed,
          detail: notes.join(" • ").slice(0, 1000),
          error: blocked.slice(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return { status, detail: notes.join(" • "), processed, failed, runId };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (runId) {
      await db
        .from("sync_runs")
        .update({
          status: "error",
          items_processed: processed,
          items_failed: failed + 1,
          error: message.slice(0, 500),
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }
    return { status: "error", detail: message, processed, failed: failed + 1, runId };
  } finally {
    await db.rpc("release_sync_lock", { _name: LOCK_NAME });
  }
}

type Settings = {
  id: string;
  api_url: string;
  api_key: string;
  ar_per_usd: number;
  markup_percent: number;
  auto_fulfill: boolean;
  balance_cached_at?: string | null;
  services_synced_at?: string | null;
};

// Balance is read from this cache by the admin screens: never live per page load.
async function refreshBalanceCache(
  db: Admin,
  api: ReturnType<typeof smmgen>,
  settings: Settings,
): Promise<string> {
  const last = settings.balance_cached_at ? Date.parse(settings.balance_cached_at) : 0;
  if (Date.now() - last < BALANCE_TTL_MS) return "";
  try {
    const b = await api.balance();
    await db
      .from("provider_settings")
      .update({
        balance_value: String(b.balance ?? ""),
        balance_currency: String(b.currency ?? "USD"),
        balance_error: "",
        balance_cached_at: new Date().toISOString(),
        rate_limited_until: null,
      })
      .eq("id", settings.id);
    return `solde mis à jour: ${b.balance} ${b.currency ?? "USD"}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db
      .from("provider_settings")
      .update({ balance_error: message.slice(0, 300), balance_cached_at: new Date().toISOString() })
      .eq("id", settings.id);
    return `solde indisponible: ${message.slice(0, 120)}`;
  }
}

async function handleJob(
  db: Admin,
  api: ReturnType<typeof smmgen>,
  settings: Settings,
  job: { id: string; kind: string; payload: unknown },
): Promise<string> {
  if (job.kind === "import_services") return importServices(db, api, settings);
  if (job.kind === "publish_services") return publishSelected(db, settings);
  if (job.kind === "submit_order") {
    const payload = (job.payload ?? {}) as { order_id?: string };
    if (!payload.order_id) throw new Error("order_id manquant");
    return submitOrder(db, api, settings, payload.order_id);
  }
  if (job.kind === "reconcile_orders") {
    const r = await reconcileOrders(db, api);
    if (r.error) throw new Error(r.error);
    return `réconciliation manuelle: ${r.checked} vérifiée(s), ${r.updated} corrigée(s)`;
  }
  throw new Error(`Type de tâche inconnu: ${job.kind}`);
}

async function importServices(db: Admin, api: ReturnType<typeof smmgen>, settings: Settings) {
  // The catalogue barely changes: skip the (very large) call when it is fresh.
  const last = settings.services_synced_at ? Date.parse(settings.services_synced_at) : 0;
  if (Date.now() - last < SERVICES_TTL_MS) {
    const published = await publishSelected(db, settings);
    return `catalogue déjà à jour (cache) • ${published}`;
  }
  const list = (await api.services()) as SmmgenService[];
  const now = new Date().toISOString();
  const rows = list.map((s) => ({
    provider_service_id: String(s.service),
    name: String(s.name ?? ""),
    category: String(s.category ?? ""),
    type: String(s.type ?? ""),
    rate_usd: Number(s.rate) || 0,
    min_qty: Number(s.min) || 0,
    max_qty: Number(s.max) || 0,
    raw: s as never,
    synced_at: now,
  }));
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db
      .from("provider_services")
      .upsert(chunk, { onConflict: "provider_service_id", ignoreDuplicates: false });
    if (error) throw new Error(error.message);
  }
  await db.from("provider_settings").update({ services_synced_at: now }).eq("id", settings.id);
  const published = await publishSelected(db, settings);
  return `import: ${rows.length} service(s) fournisseur • ${published}`;
}

function priceAr(rateUsd: number, settings: Settings) {
  return Math.ceil(rateUsd * settings.ar_per_usd * (1 + settings.markup_percent / 100));
}

async function publishSelected(db: Admin, settings: Settings) {
  const { data: selected } = await db.from("provider_services").select("*").eq("selected", true);
  let count = 0;
  for (const ps of selected ?? []) {
    const price = priceAr(Number(ps.rate_usd), settings);
    const { data: existing } = await db
      .from("services")
      .select("id")
      .eq("provider_service_id", ps.provider_service_id)
      .maybeSingle();
    const meta = {
      provider_name: "SMMGen",
      provider_min: ps.min_qty,
      provider_max: ps.max_qty,
      provider_rate_usd: Number(ps.rate_usd),
    };
    if (existing) {
      await db
        .from("services")
        .update({ price, name_fr: ps.name, name_mg: ps.name, category: ps.category, unit: 1000, ...meta })
        .eq("id", existing.id);
    } else {
      await db.from("services").insert({
        platform: ps.category.split(" ")[0] || "SMMGen",
        category: ps.category,
        name_fr: ps.name,
        name_mg: ps.name,
        unit: 1000,
        price,
        provider_service_id: ps.provider_service_id,
        active: true,
        ...meta,
      });
    }
    count += 1;
  }
  return `publication: ${count} service(s) synchronisé(s)`;
}

async function submitOrder(
  db: Admin,
  api: ReturnType<typeof smmgen>,
  settings: Settings,
  orderId: string,
) {
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Commande introuvable");
  // Duplicate guard: never send the same order twice.
  if (order.provider_order_id) return `commande ${orderId} déjà envoyée`;
  if (!settings.auto_fulfill) return `envoi automatique désactivé (${orderId})`;

  const { data: service } = order.service_id
    ? await db
        .from("services")
        .select("provider_service_id, provider_min, provider_max, platform, name_fr")
        .eq("id", order.service_id)
        .maybeSingle()
    : { data: null };

  // --- mapping + input validation before touching the provider ---
  let providerServiceId = service?.provider_service_id;
  let min = service?.provider_min ?? 1;
  let max = service?.provider_max ?? Number.MAX_SAFE_INTEGER;
  const reactionNote = /^reaction:([a-z-]+)(?:;visibility:invisible)?(?:;target:[^;]{1,100})?$/.exec(order.notes ?? "");
  if (service && isReactionService(service.platform, service.name_fr) && reactionNote) {
    providerServiceId = reactionProviderId(reactionNote[1] ?? "", service.name_fr, /;visibility:invisible/.test(order.notes ?? ""));
    if (!providerServiceId) throw new Error("Type de réaction invalide");
    const { data: matched } = await db.from("provider_services")
      .select("min_qty, max_qty")
      .eq("provider_service_id", providerServiceId)
      .maybeSingle();
    if (!matched) throw new Error("Réaction indisponible chez le fournisseur");
    min = matched.min_qty;
    max = matched.max_qty;
  }
  if (!providerServiceId) {
    const msg = "Service non lié à SMMGen (mapping manquant)";
    await db
      .from("orders")
      .update({ provider_error: msg, api_error: msg, status: "failed" })
      .eq("id", orderId);
    return `commande ${orderId}: ${msg}`;
  }
  if (!/^https?:\/\//i.test(order.target_link ?? "")) {
    throw new Error("Lien invalide : il doit commencer par http(s)://");
  }
  if (order.quantity < min || order.quantity > max) {
    throw new Error(`Quantité hors limites fournisseur (min ${min}, max ${max})`);
  }

  const res = await api.add(providerServiceId, order.target_link, order.quantity, orderId, order.comments || undefined);
  const providerOrderId = res?.order === undefined || res.order === null ? "" : String(res.order);
  if (!providerOrderId) {
    const msg = "SMMGen n'a retourné aucun identifiant de commande";
    await db
      .from("orders")
      .update({
        provider_error: msg,
        api_error: msg,
        status: "failed",
        provider_response: res as never,
      })
      .eq("id", orderId);
    throw new Error(msg);
  }

  await db
    .from("orders")
    .update({
      provider_order_id: providerOrderId,
      provider_status: "Pending",
      status: "processing",
      provider_error: "",
      api_error: "",
      provider_response: res as never,
      provider_charge: res.charge === undefined ? null : Number(res.charge),
      sent_at: new Date().toISOString(),
      next_retry_at: null,
      last_synced_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .eq("id", orderId);
  return `commande ${orderId} envoyée (SMMGen #${providerOrderId})`;
}

async function reconcileOrders(db: Admin, api: ReturnType<typeof smmgen>) {
  const { data: orders } = await db
    .from("orders")
    .select("id, provider_order_id, status, provider_status")
    .not("provider_order_id", "is", null)
    .in("status", ["pending", "processing"])
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(MAX_ORDERS_PER_RECONCILE);

  const list = (orders ?? []).filter((o) => o.provider_order_id);
  if (!list.length) return { checked: 0, updated: 0, error: "" };

  // Batched status checks: up to 100 orders per provider request.
  const batches: (typeof list)[] = [];
  for (let i = 0; i < list.length && batches.length < MAX_STATUS_BATCHES; i += STATUS_BATCH_SIZE) {
    batches.push(list.slice(i, i + STATUS_BATCH_SIZE));
  }

  let updated = 0;
  let checked = 0;
  for (const batch of batches) {
    try {
      const statuses = await api.multiStatus(batch.map((o) => String(o.provider_order_id)));
      checked += batch.length;
      for (const order of batch) {
        const key = String(order.provider_order_id);
        const s = statuses?.[key];
        if (!s || s.error) continue;
        const local = mapProviderStatus(s.status);
        const patch = {
          provider_status: String(s.status ?? ""),
          remains: s.remains === undefined ? null : Number(s.remains),
          start_count: s.start_count === undefined ? null : Number(s.start_count),
          ...(s.charge === undefined ? {} : { provider_charge: Number(s.charge) }),
          last_synced_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          ...(local !== order.status ? { status: local } : {}),
        };
        await db.from("orders").update(patch).eq("id", order.id);
        if (local !== order.status) updated += 1;
      }
    } catch (e) {
      return { checked, updated, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return { checked, updated, error: "" };
}
