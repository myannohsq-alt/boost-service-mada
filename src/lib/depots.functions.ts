import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEPOTS_KEY, DEPOTS_URL, phoneKey, type Depot } from "@/lib/external-depots";

// Server-side verification: re-reads the external Depots table, prevents replay, then credits.
export const verifyDepot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ phone: z.string().min(9).max(20), montant: z.number().int().min(1000).max(2_000_000) }).parse(i))
  .handler(async ({ data, context }) => {
    const key = phoneKey(data.phone);
    if (key.length !== 9) return { found: false as const };
    const url = `${DEPOTS_URL}/rest/v1/Depots?select=*&montant=gte.${data.montant}&order=created_at.desc&limit=200`;
    const res = await fetch(url, { headers: { apikey: DEPOTS_KEY } });
    if (!res.ok) throw new Error("Depots indisponible");
    const rows = ((await res.json()) as Depot[]).filter((r) => (r.message ?? "").replace(/\D/g, "").includes(key));
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
