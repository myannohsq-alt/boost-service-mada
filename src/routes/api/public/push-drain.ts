import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/push-drain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-hook-secret") ?? "";
        if (!provided) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const { data: cfg } = await db.from("push_config").select("*").eq("id", 1).maybeSingle();
        if (!cfg || cfg.hook_secret !== provided) return new Response("Unauthorized", { status: 401 });

        const { data: queue } = await db.from("push_queue").select("*").is("sent_at", null).order("created_at").limit(10);
        if (!queue?.length) return Response.json({ sent: 0 });
        // Claim rows first so concurrent wakes never double-send.
        const ids = queue.map((q: { id: string }) => q.id);
        const { data: claimed } = await db.from("push_queue").update({ sent_at: new Date().toISOString() }).in("id", ids).is("sent_at", null).select("*");
        if (!claimed?.length) return Response.json({ sent: 0 });

        const { sendWebPush } = await import("@/lib/web-push.server");
        const { data: subs } = await db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth");
        let admins: Set<string> | null = null;
        let sent = 0;
        const dead: string[] = [];
        for (const item of claimed) {
          let targets = subs ?? [];
          if (item.target === "admins") {
            if (!admins) {
              const { data: r } = await db.from("user_roles").select("user_id").eq("role", "admin");
              admins = new Set((r ?? []).map((x: { user_id: string }) => x.user_id));
            }
            targets = targets.filter((s: { user_id: string }) => admins!.has(s.user_id));
          }
          if (typeof item.target === "string" && item.target.startsWith("user:")) {
            const uid = item.target.slice(5);
            targets = targets.filter((s: { user_id: string }) => s.user_id === uid);
          }
          if (item.exclude_user) targets = targets.filter((s: { user_id: string }) => s.user_id !== item.exclude_user);
          await Promise.all(targets.map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
            try {
              const st = await sendWebPush(s, { title: item.title, body: item.body, url: item.url, tag: item.target === "admins" ? "depot" : item.url }, cfg.vapid_public, cfg.vapid_private);
              if (st === 404 || st === 410) dead.push(s.id); else if (st < 300) sent++;
            } catch (e) { console.error("push fail", e); }
          }));
        }
        if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);
        return Response.json({ sent, removed: dead.length });
      },
    },
  },
});
