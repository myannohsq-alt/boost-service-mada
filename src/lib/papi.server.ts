import { PAPI_BASE, rechargeIdFromRef } from "@/lib/papi-core";

type PapiStatus = { linkStatus?: string; paymentStatus?: string; amount?: number; currency?: string; message?: string | null };

export async function papiGetStatus(reference: string): Promise<PapiStatus | null> {
  const key = process.env["PAPI_API_KEY"];
  if (!key) throw new Error("PAPI_API_KEY manquant");
  const res = await fetch(`${PAPI_BASE}/payment-links/${encodeURIComponent(reference)}`, { headers: { Token: key } });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: PapiStatus };
  return j.data ?? null;
}

/** Confirms with Papi itself, then credits once (auto_approve_recharge locks the row and only accepts 'pending'). */
export async function settlePapiPayment(reference: string) {
  const rid = rechargeIdFromRef(reference);
  if (!rid) return { state: "unknown" as const };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: r } = await supabaseAdmin.from("recharges").select("*").eq("id", rid).maybeSingle();
  if (!r || r.reference !== reference) return { state: "unknown" as const };
  if (r.status === "approved") return { state: "success" as const, amount: Number(r.amount) };
  if (r.status === "rejected") return { state: "failed" as const };
  const st = await papiGetStatus(reference);
  if (!st) return { state: "pending" as const };
  if (st.paymentStatus === "SUCCESS" && st.linkStatus === "PAID") {
    if (st.currency !== "MGA" || Math.round(Number(st.amount)) !== Math.round(Number(r.amount))) {
      await supabaseAdmin.from("activity_log").insert({ user_id: r.user_id, action: "papi_mismatch", detail: `${reference} ${st.amount} ${st.currency}` });
      return { state: "pending" as const }; // left for admin review
    }
    const { error } = await supabaseAdmin.rpc("auto_approve_recharge", { _recharge_id: rid });
    if (error) {
      const { data: again } = await supabaseAdmin.from("recharges").select("status").eq("id", rid).single();
      return again?.status === "approved" ? { state: "success" as const, amount: Number(r.amount) } : { state: "pending" as const };
    }
    return { state: "success" as const, amount: Number(r.amount) };
  }
  if (st.paymentStatus === "FAILED" || st.linkStatus === "EXPIRED" || st.linkStatus === "DISABLED") {
    await supabaseAdmin.from("recharges").update({ status: "rejected" }).eq("id", rid).eq("status", "pending");
    return { state: "failed" as const, message: st.message ?? null };
  }
  return { state: "pending" as const };
}
