import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEPOTS_KEY, DEPOTS_URL, normDepot, phoneKey } from "@/lib/external-depots";

// Server-side verification: re-reads the external Depots table, prevents replay, then credits.
export const verifyDepot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ phone: z.string().min(9).max(20), montant: z.number().int().min(1000).max(2_000_000) }).parse(i))
  .handler(async ({ data, context }) => {
    const key = phoneKey(data.phone);
    if (key.length !== 9) return { found: false as const };
    const url = `${DEPOTS_URL}/rest/v1/Depots?select=*&limit=1000`;
    const res = await fetch(url, { headers: { apikey: DEPOTS_KEY } });
    if (!res.ok) throw new Error("Depots indisponible");
    const rows = ((await res.json()) as Record<string, unknown>[]).map(normDepot)
      .filter((r) => r.montant >= data.montant && r.message.replace(/\D/g, "").includes(key))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (!rows.length) return { found: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = rows.map((r) => String(r.id));
    const { data: used } = await supabaseAdmin.from("external_depot_claims").select("depot_id").in("depot_id", ids);
    const usedSet = new Set((used ?? []).map((u) => u.depot_id));
    const fresh = rows.find((r) => !usedSet.has(String(r.id)));
    if (!fresh) return { found: false as const };

    // Primary key guards double crediting under concurrency.
    const { error } = await supabaseAdmin.from("external_depot_claims").insert({
      depot_id: String(fresh.id), user_id: context.userId, montant: Number(fresh.montant), phone: key,
    });
    if (error) return { found: false as const };

    const amount = Number(fresh.montant);
    const bonus = amount >= 40000 ? Math.round(amount * 0.05) : 0;
    const { data: prof } = await supabaseAdmin.from("profiles").select("balance").eq("id", context.userId).single();
    await supabaseAdmin.from("profiles").update({ balance: Number(prof?.balance ?? 0) + amount + bonus }).eq("id", context.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId, title: "Recharge validée ✅", body: `Dépôt confirmé ${amount} Ar.${bonus ? " 🎁 Bonus 5% offert !" : ""}`,
    });
    return { found: true as const, montant: amount, bonus };
  });

// Auto-validates a just-submitted pending recharge when the admin enabled "Automatique" for its operator.
export const autoRecharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ rechargeId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("recharges").select("*").eq("id", data.rechargeId).single();
    if (!r || r.user_id !== context.userId || r.status !== "pending") return { ok: false as const };
    const { data: cfg } = await supabaseAdmin.from("deposit_pauses").select("auto_enabled").eq("method", r.method).maybeSingle();
    if (!cfg?.auto_enabled) return { ok: false as const, manual: true };

    const key = phoneKey(String(r.sender_phone ?? ""));
    const ref = String(r.reference ?? "").trim().toLowerCase();
    const res = await fetch(`${DEPOTS_URL}/rest/v1/Depots?select=*&order=created_at.desc&limit=500`, { headers: { apikey: DEPOTS_KEY } });
    if (!res.ok) return { ok: false as const };
    // Match the SMS by sender number or reference, regardless of amount.
    const rows = ((await res.json()) as Record<string, unknown>[]).map(normDepot).filter((d) => {
      const digits = d.message.replace(/\D/g, "");
      return (key.length === 9 && digits.includes(key)) || (ref.length >= 4 && d.message.toLowerCase().includes(ref));
    });
    if (!rows.length) return { ok: false as const };
    const ids = rows.map((d) => String(d.id));
    const { data: used } = await supabaseAdmin.from("external_depot_claims").select("depot_id").in("depot_id", ids);
    const usedSet = new Set((used ?? []).map((u) => u.depot_id));
    const fresh = rows.find((d) => !usedSet.has(String(d.id)));
    if (!fresh) return { ok: false as const };
    // Rule: declared amount above the amount actually sent => automatic refusal.
    // Declared amount equal or below => accepted, credited with the declared amount.
    if (Number(r.amount) > Number(fresh.montant)) {
      await supabaseAdmin.from("recharges").update({ status: "rejected" }).eq("id", r.id).eq("status", "pending");
      await supabaseAdmin.from("notifications").insert({
        user_id: r.user_id, title: "Recharge refusée ❌",
        body: `Montant déclaré ${r.amount} Ar supérieur au montant reçu ${fresh.montant} Ar. Refaites la demande avec le bon montant.`,
      });
      return { ok: false as const, rejected: true as const, received: Number(fresh.montant) };
    }
    const { error } = await supabaseAdmin.from("external_depot_claims").insert({
      depot_id: String(fresh.id), user_id: context.userId, montant: Number(r.amount), phone: key,
    });
    if (error) return { ok: false as const };
    const { error: e2 } = await supabaseAdmin.rpc("auto_approve_recharge", { _recharge_id: r.id });
    if (e2) return { ok: false as const };
    return { ok: true as const, montant: Number(r.amount) };
  });
