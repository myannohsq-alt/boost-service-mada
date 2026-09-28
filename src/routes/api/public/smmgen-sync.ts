import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/smmgen-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? "";
        if (!provided) return new Response("Unauthorized", { status: 401 });

        // The scheduler sends the secret stored in provider_settings; accept it
        // (or the optional env secret) so the 5-minute cycle is never blocked.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.from("provider_settings").select("cron_secret").limit(1).maybeSingle();
        const allowed = [data?.cron_secret ?? "", process.env["SMMGEN_CRON_SECRET"] ?? ""].filter(Boolean);
        if (!allowed.includes(provided)) return new Response("Unauthorized", { status: 401 });

        const { runSyncCycle } = await import("@/lib/sync-worker.server");
        const result = await runSyncCycle("cron");
        return Response.json(result);
      },
    },
  },
});
