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
        const secret = process.env["ORDER_SMS_HOOK_SECRET"];
        if (secret) {
          const got = request.headers.get("x-hook-secret");
          if (got !== secret) return new Response("Unauthorized", { status: 401 });
        }
        const apiKey = process.env["INFINIREACH_KEY"];
        if (!apiKey) return new Response("Missing INFINIREACH_KEY", { status: 500 });

        let order: Record<string, unknown>;
        try {
          const payload = (await request.json()) as { record?: Record<string, unknown> };
          order = payload.record ?? (payload as Record<string, unknown>);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const id = String(order["id"] ?? "");
        const amount = String(order["amount"] ?? "");
        const userId = String(order["user_id"] ?? "");
        if (!id || !userId) return new Response("Missing id/user_id", { status: 400 });

        // Phone and name live on profiles, not orders
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("phone, name")
          .eq("id", userId)
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
