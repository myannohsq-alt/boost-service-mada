// Background worker for the SMMGen queue (server-only).
// Bounded batches, single-flight lock, idempotent progress, circuit breaker.
import { smmgen, mapProviderStatus, type SmmgenService } from "./smmgen.server";

const LOCK_NAME = "smmgen-worker";
const LOCK_SECONDS = 240;
const MAX_JOBS_PER_RUN = 5;
const MAX_ORDERS_PER_RECONCILE = 50;
const MAX_ATTEMPTS = 2; // first try + one automatic retry
const RETRY_DELAY_MS = 60_000; // retry a failed request once after 60 seconds

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

export async function enqueueJob(kind: string, payload: Record<string, unknown> = {}, dedupeKey?: string) {
  const db = await admin();
  const { error } = await db.from("sync_jobs").insert({
    kind,
    payload: payload as never,
    dedupe_key: dedupeKey ?? null,
  });
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message);
}

export async function runSyncCycle(trigger: string): Promise<CycleResult> {
  const db = await admin();

  const { data: settings } = await db.from("provider_settings").select("*").limit(1).maybeSingle();
  if (!settings || !settings.api_key) {
    return { status: "skipped", detail: "Clé API SMMGen non configurée", processed: 0, failed: 0 };
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

  try {
    const { data: jobs } = await db
      .from("sync_jobs")
      .select("*")
      .eq("status", "queued")
      .lte("run_after", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(jobLimit);

    for (const job of jobs ?? []) {
      if (blocked) break;
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
        failed += 1;
        const giveUp = job.attempts + 1 >= MAX_ATTEMPTS || isBlockingError(message);
        const nextRetry = new Date(Date.now() + RETRY_DELAY_MS).toISOString();
        await db
          .from("sync_jobs")
          .update({
            status: giveUp ? "failed" : "queued",
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
                retry_count: job.attempts + 1,
                next_retry_at: giveUp ? null : nextRetry,
                ...(giveUp ? { status: "failed" } : {}),
              })
              .eq("id", orderId);
          }
        }
        if (isBlockingError(message)) blocked = message;
      }
    }

    if (!blocked && !paused) {
      const r = await reconcileOrders(db, api);
      processed += r.updated;
      if (r.error) {
        failed += 1;
        if (isBlockingError(r.error)) blocked = r.error;
        notes.push(`réconciliation: ${r.error}`);
      } else {
        notes.push(`réconciliation: ${r.checked} vérifiée(s), ${r.updated} corrigée(s)`);
      }
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
};

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
  if (order.provider_order_id) return `commande ${orderId} déjà envoyée`;
  if (!settings.auto_fulfill) return `envoi automatique désactivé (${orderId})`;

  const { data: service } = order.service_id
    ? await db
        .from("services")
        .select("provider_service_id, provider_min, provider_max")
        .eq("id", order.service_id)
        .maybeSingle()
    : { data: null };

  // --- mapping + input validation before touching the provider ---
  const providerServiceId = service?.provider_service_id;
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
  const min = service?.provider_min ?? 1;
  const max = service?.provider_max ?? Number.MAX_SAFE_INTEGER;
  if (order.quantity < min || order.quantity > max) {
    throw new Error(`Quantité hors limites fournisseur (min ${min}, max ${max})`);
  }

  const res = await api.add(providerServiceId, order.target_link, order.quantity, orderId);
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

  try {
    const statuses = await api.multiStatus(list.map((o) => String(o.provider_order_id)));
    let updated = 0;
    for (const order of list) {
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
    return { checked: list.length, updated, error: "" };
  } catch (e) {
    return { checked: list.length, updated: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
