import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/smmgen-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? "";
        const expected = process.env['SMMGEN_CRON_SECRET'] ?? "";
        if (!expected || provided.length !== expected.length || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { runSyncCycle } = await import("@/lib/sync-worker.server");
        const result = await runSyncCycle("cron");
        return Response.json(result);
      },
    },
  },
});
