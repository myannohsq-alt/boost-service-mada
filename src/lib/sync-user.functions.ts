import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Called right after a customer places an order: pushes the queued order to SMMGen.
export const fulfillNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { runSyncCycle } = await import("@/lib/sync-worker.server");
    const result = await runSyncCycle("commande");
    return { status: result.status, detail: result.detail };
  });
