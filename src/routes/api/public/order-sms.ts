import { createFileRoute } from "@tanstack/react-router";

const INFINIREACH_URL = "https://api.infinireach.io/api/v1/messages";
const ADMIN_PHONE = "+261375141025";

async function sendSms(apiKey: string, to: string, message: string) {
  const res = await fetch(INFINIREACH_URL, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ to, message, sim_slot: 0 }),
  });
  return { ok: res.ok, status: res.status };
}

export const Route = createFileRoute("/api/public/order-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Always require the hook header; compare to env secret when configured.
        const got = request.headers.get("x-hook-secret") ?? "";
        if (got.length < 32) return new Response("Unauthorized", { status: 401 });
        const secret = process.env["ORDER_SMS_HOOK_SECRET"];
        if (secret && got !== secret) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env["INFINIREACH_KEY"];
        if (!apiKey) return new Response("Missing INFINIREACH_KEY", { status: 500 });

        let payloadId = "";
        try {
          const payload = (await request.json()) as { record?: Record<string, unknown>; id?: unknown };
          payloadId = String((payload.record ?? payload)?.["id" as never] ?? "");
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        if (!/^[0-9a-f-]{36}$/i.test(payloadId)) return new Response("Bad id", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Never trust caller data: load the real order and require it to be brand new.
        const { data: ord } = await supabaseAdmin
          .from("orders")
          .select("id, user_id, amount, created_at")
          .eq("id", payloadId)
          .maybeSingle();
        if (!ord) return new Response("Not found", { status: 404 });
        if (Date.now() - new Date(ord.created_at as string).getTime() > 3 * 60 * 1000)
          return new Response("Too old", { status: 409 });

        const id = String(ord.id);
        const amount = String(ord.amount ?? "");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("phone, name")
          .eq("id", ord.user_id as string)
          .maybeSingle();
        const phone = String(profile?.phone ?? "");
        const name = String(profile?.name ?? "");
        if (!phone) return Response.json({ skipped: "no phone on profile" });

        const client = await sendSms(
          apiKey,
          phone,
          `SMM B&S: Commande #${id} de ${amount}Ar reçue! Depot automatique en cours. Merci!`,
        );
        const admin = await sendSms(
          apiKey,
          ADMIN_PHONE,
          `SMM B&S 🔔 Nouvelle commande #${id} - ${amount}Ar - Client: ${phone} - ${name}`,
        );
        return Response.json({ client, admin });
      },
    },
  },
});
