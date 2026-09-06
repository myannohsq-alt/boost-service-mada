import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data: isAdmin } = await (context.supabase.rpc as (
    n: string,
    a: Record<string, unknown>,
  ) => Promise<{ data: boolean | null }>)("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const getSyncOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [settings, runs, jobs, providerCount, selectedCount] = await Promise.all([
      supabaseAdmin.from("provider_settings").select("*").limit(1).maybeSingle(),
      supabaseAdmin.from("sync_runs").select("*").order("started_at", { ascending: false }).limit(25),
      supabaseAdmin
        .from("sync_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin.from("provider_services").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("provider_services")
        .select("id", { count: "exact", head: true })
        .eq("selected", true),
    ]);

    const s = settings.data;
    return {
      settings: s
        ? {
            api_url: s.api_url,
            has_key: Boolean(s.api_key),
            key_hint: s.api_key ? `••••${s.api_key.slice(-4)}` : "",
            ar_per_usd: Number(s.ar_per_usd),
            markup_percent: s.markup_percent,
            auto_fulfill: s.auto_fulfill,
            paused: s.paused,
            pause_reason: s.pause_reason,
            updated_at: s.updated_at,
          }
        : null,
      runs: runs.data ?? [],
      jobs: jobs.data ?? [],
      providerCount: providerCount.count ?? 0,
      selectedCount: selectedCount.count ?? 0,
    };
  });

export const saveProviderSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    api_url: string;
    api_key?: string;
    ar_per_usd: number;
    markup_percent: number;
    auto_fulfill: boolean;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("provider_settings").select("id").limit(1).single();
    if (!row) throw new Error("Réglages fournisseur introuvables");
    const patch: {
      api_url: string;
      ar_per_usd: number;
      markup_percent: number;
      auto_fulfill: boolean;
      api_key?: string;
    } = {
      api_url: data.api_url.trim(),
      ar_per_usd: Number(data.ar_per_usd) || 4500,
      markup_percent: Number(data.markup_percent) || 0,
      auto_fulfill: data.auto_fulfill,
    };
    if (data.api_key && data.api_key.trim()) patch.api_key = data.api_key.trim();
    const { error } = await supabaseAdmin.from("provider_settings").update(patch).eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resumeSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("provider_settings").select("id").limit(1).single();
    if (!row) throw new Error("Réglages fournisseur introuvables");
    await supabaseAdmin.from("provider_settings").update({ paused: false, pause_reason: "" }).eq("id", row.id);
    return { ok: true };
  });

export const triggerSyncJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "import_services" | "publish_services" | "reconcile_orders" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { enqueueJob, runSyncCycle } = await import("@/lib/sync-worker.server");
    await enqueueJob(data.kind, {});
    const result = await runSyncCycle(`manuel:${data.kind}`);
    return result;
  });

export const listProviderServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; onlySelected?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("provider_services")
      .select("id, provider_service_id, name, category, rate_usd, min_qty, max_qty, selected")
      .order("name", { ascending: true })
      .limit(60);
    if (data.onlySelected) q = q.eq("selected", true);
    const term = (data.search ?? "").trim();
    if (term) q = q.or(`name.ilike.%${term}%,category.ilike.%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const toggleProviderService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; selected: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("provider_services")
      .update({ selected: data.selected })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------- mapping ---

export const runAutoMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { autoMapServices } = await import("@/lib/service-mapping.server");
    return await autoMapServices();
  });

export const listLocalServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; onlyUnmapped?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("services")
      .select(
        "id, platform, category, name_fr, unit, price, active, provider_service_id, provider_name, provider_min, provider_max, provider_rate_usd",
      )
      .order("platform", { ascending: true })
      .limit(200);
    if (data.onlyUnmapped) q = q.is("provider_service_id", null);
    const term = (data.search ?? "").trim();
    if (term) q = q.or(`name_fr.ilike.%${term}%,category.ilike.%${term}%,platform.ilike.%${term}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setServiceMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { serviceId: string; providerServiceId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pid = data.providerServiceId.trim();
    if (!pid) {
      const { error } = await supabaseAdmin
        .from("services")
        .update({
          provider_service_id: null,
          provider_name: "BOOST SERVICE MADA (manuel)",
          provider_min: null,
          provider_max: null,
          provider_rate_usd: null,
        })
        .eq("id", data.serviceId);
      if (error) throw new Error(error.message);
      return { ok: true, detail: "Mapping retiré" };
    }
    const { data: ps } = await supabaseAdmin
      .from("provider_services")
      .select("provider_service_id, name, min_qty, max_qty, rate_usd")
      .eq("provider_service_id", pid)
      .maybeSingle();
    if (!ps) throw new Error(`ID SMMGen #${pid} introuvable dans le catalogue importé`);
    const { error } = await supabaseAdmin
      .from("services")
      .update({
        provider_service_id: ps.provider_service_id,
        provider_name: "SMMGen",
        provider_min: ps.min_qty,
        provider_max: ps.max_qty,
        provider_rate_usd: Number(ps.rate_usd),
      })
      .eq("id", data.serviceId);
    if (error) throw new Error(error.message);
    return { ok: true, detail: `Lié à #${pid} — ${ps.name}` };
  });

// ------------------------------------------------------------------ debug ---

async function apiClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: s } = await supabaseAdmin.from("provider_settings").select("*").limit(1).maybeSingle();
  if (!s?.api_key) throw new Error("Clé API SMMGen non configurée");
  const { smmgen } = await import("@/lib/smmgen.server");
  return { api: smmgen(s.api_url, s.api_key), settings: s };
}

export const smmgenDebug = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { test: "connection" | "balance" | "services" | "status"; order?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    try {
      const { api, settings } = await apiClient();
      if (data.test === "connection" || data.test === "balance") {
        const b = await api.balance();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("provider_settings")
          .update({
            balance_value: String(b.balance ?? ""),
            balance_currency: String(b.currency ?? "USD"),
            balance_error: "",
            balance_cached_at: new Date().toISOString(),
            rate_limited_until: null,
          })
          .eq("id", settings.id);
        return { ok: true, detail: `Solde SMMGen : ${b.balance} ${b.currency ?? "USD"}` };
      }

      if (data.test === "services") {
        const list = await api.services();
        return { ok: true, detail: `${list.length} service(s) disponibles chez SMMGen` };
      }
      if (!data.order) throw new Error("Indiquez un ID de commande SMMGen");
      const s = await api.status(data.order);
      return { ok: true, detail: `#${data.order} → ${s.status ?? "?"} (restant ${s.remains ?? "—"})` };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  });

export const getSmmgenStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const head = { count: "exact" as const, head: true };
    const [imported, mapped, activeSvc, sent, failed, logs] = await Promise.all([
      supabaseAdmin.from("provider_services").select("id", head),
      supabaseAdmin.from("services").select("id", head).not("provider_service_id", "is", null),
      supabaseAdmin.from("services").select("id", head).eq("active", true),
      supabaseAdmin.from("orders").select("id", head).not("provider_order_id", "is", null),
      supabaseAdmin.from("orders").select("id", head).eq("status", "failed"),
      supabaseAdmin
        .from("api_logs")
        .select("id, action, ok, error, status_code, duration_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    // Balance comes from the cached value refreshed by the background worker,
    // never from a live provider call on page load (429 protection).
    const { data: s } = await supabaseAdmin
      .from("provider_settings")
      .select("balance_value, balance_currency, balance_error, balance_cached_at, rate_limited_until")
      .limit(1)
      .maybeSingle();
    const balance = s?.balance_value ? `${s.balance_value} ${s.balance_currency || "USD"}` : "";
    const balanceError = balance ? "" : (s?.balance_error ?? "");
    return {
      balance,
      balanceError,
      balanceAt: s?.balance_cached_at ?? null,
      rateLimitedUntil: s?.rate_limited_until ?? null,
      imported: imported.count ?? 0,
      mapped: mapped.count ?? 0,
      activeServices: activeSvc.count ?? 0,
      sentOrders: sent.count ?? 0,
      failedOrders: failed.count ?? 0,
      logs: logs.data ?? [],
    };

  });

export const listFailedOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select(
        "id, service_label, quantity, target_link, status, api_error, provider_error, provider_order_id, retry_count, created_at",
      )
      .or("status.eq.failed,api_error.neq.")
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });

export const retryOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, provider_order_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Commande introuvable");
    if (order.provider_order_id) throw new Error("Commande déjà envoyée à SMMGen");
    await supabaseAdmin
      .from("orders")
      .update({ status: "pending", api_error: "", provider_error: "", retry_count: 0, next_retry_at: null })
      .eq("id", data.orderId);
    await supabaseAdmin
      .from("sync_jobs")
      .insert({ kind: "submit_order", payload: { order_id: data.orderId } as never, dedupe_key: null });
    const { runSyncCycle } = await import("@/lib/sync-worker.server");
    const r = await runSyncCycle(`retry:${data.orderId}`);
    return { status: r.status, detail: r.detail };
  });
