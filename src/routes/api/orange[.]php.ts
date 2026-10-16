import { createFileRoute } from "@tanstack/react-router";

// SMS Forwarder webhook for automatic Orange Money deposits. Always answers JSON.
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

async function readSms(request: Request): Promise<{ text: string; key: string | null }> {
  const url = new URL(request.url);
  let key = url.searchParams.get("key") ?? request.headers.get("x-api-key");
  let text = url.searchParams.get("message") ?? url.searchParams.get("text") ?? "";
  if (request.method === "POST") {
    const raw = await request.text();
    try {
      const b = JSON.parse(raw) as Record<string, unknown>;
      text = String(b["message"] ?? b["text"] ?? b["msg"] ?? b["body"] ?? b["content"] ?? text);
      key = key ?? (b["key"] ? String(b["key"]) : null);
    } catch {
      const p = new URLSearchParams(raw);
      text = p.get("message") ?? p.get("text") ?? p.get("msg") ?? (raw || text);
      key = key ?? p.get("key");
    }
  }
  return { text, key };
}

async function handle(request: Request) {
  try {
    const { text, key } = await readSms(request);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin.from("provider_settings").select("cron_secret").limit(1).maybeSingle();
    const secret = process.env["ORANGE_SMS_SECRET"] || settings?.cron_secret;
    if (!secret || key !== secret) return json({ success: false, error: "unauthorized" }, 401);
    if (!text) return json({ success: false, error: "empty message" }, 400);

    const amountMatch = text.replace(/\u00a0/g, " ").match(/(\d[\d .,]*)\s*(?:Ar|MGA)/i);
    const amount = amountMatch ? Number(amountMatch[1]!.replace(/[ .,]/g, "")) : NaN;
    const upper = text.toUpperCase();

    const { data: pending } = await supabaseAdmin
      .from("recharges")
      .select("id,user_id,amount,reference")
      .eq("status", "pending")
      .eq("method", "orange")
      .order("created_at", { ascending: false })
      .limit(200);
    const match = (pending ?? []).find(
      (r) => r.reference.trim().length >= 3 && upper.includes(r.reference.trim().toUpperCase()) &&
        (!Number.isFinite(amount) || Number(r.amount) === amount),
    );
    if (!match) return json({ success: true, credited: false, amount: Number.isFinite(amount) ? amount : null, message: "no matching pending deposit" });

    // Atomic guard: only one call can flip pending -> approved.
    const { data: flipped } = await supabaseAdmin
      .from("recharges").update({ status: "approved" }).eq("id", match.id).eq("status", "pending").select("id");
    if (!flipped?.length) return json({ success: true, credited: false, message: "already processed" });

    const { data: prof } = await supabaseAdmin.from("profiles").select("balance").eq("id", match.user_id).single();
    await supabaseAdmin.from("profiles").update({ balance: Number(prof?.balance ?? 0) + Number(match.amount) }).eq("id", match.user_id);
    return json({ success: true, credited: true, recharge_id: match.id, amount: Number(match.amount) });
  } catch (e) {
    console.error("orange.php", e);
    return json({ success: false, error: "server error" }, 500);
  }
}

export const Route = createFileRoute("/api/orange.php")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
