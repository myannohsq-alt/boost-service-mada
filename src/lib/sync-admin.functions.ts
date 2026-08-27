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
    const patch: Record<string, unknown> = {
      api_url: data.api_url.trim(),
      ar_per_usd: Number(data.ar_per_usd) || 4500,
      markup_percent: Number(data.markup_percent) || 0,
      auto_fulfill: data.auto_fulfill,
    };
    if (data.api_key && data.api_key.trim()) patch['api_key'] = data.api_key.trim();
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
