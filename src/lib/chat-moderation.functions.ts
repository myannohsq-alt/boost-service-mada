import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BAN_DAYS = 30;

/** AI checks a group message; insults/hate/harassment ban the author for 30 days. Admins are never banned. */
export const moderateChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => ({ text: String(d?.text ?? "").slice(0, 4000) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const text = data.text.trim();
    if (!text) return { ok: true as const };
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (isAdmin) return { ok: true as const };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: true as const };
    let verdict = { bad: false, reason: "" };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          reasoning_effort: "low",
          messages: [
            { role: "system", content: "Tu modères un groupe de discussion malgache (malgache, français, anglais, argot gasy). Réponds UNIQUEMENT en JSON {\"bad\":true|false,\"reason\":\"courte raison en malgache\"}. bad=true seulement pour: insultes, gros mots, vulgarité sexuelle, haine, menaces, harcèlement, arnaque. Les critiques polies, plaintes ou messages longs normaux sont bad=false." },
            { role: "user", content: text },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const j: any = await res.json();
        const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
        verdict = { bad: !!parsed.bad, reason: String(parsed.reason ?? "").slice(0, 200) };
      }
    } catch { /* fail open: never block chat because AI is down */ }
    if (!verdict.bad) return { ok: true as const };

    const until = new Date(Date.now() + BAN_DAYS * 86400000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("name").eq("id", userId).maybeSingle();
    await (supabaseAdmin as any).from("chat_bans").upsert({ user_id: userId, author_name: p?.name ?? "", reason: verdict.reason || "Teny ratsy", message: text.slice(0, 500), banned_until: until, created_at: new Date().toISOString() });
    return { ok: false as const, until, reason: verdict.reason || "Teny ratsy" };
  });
