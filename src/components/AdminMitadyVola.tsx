import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatAr } from "@/lib/i18n";

// New tables may not be in generated types yet.
const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: object) => any };

export function AdminMitadyVola() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-mitady"],
    queryFn: async () => {
      const [o, c, w] = await Promise.all([
        db.from("boost_orders").select("*").in("status", ["pending_payment", "pending_approval", "processing"]).order("created_at", { ascending: false }).limit(50),
        db.from("mission_claims").select("*").eq("status", "pending").order("created_at").limit(100),
        db.from("booster_withdrawals").select("*").eq("status", "pending").order("created_at").limit(50),
      ]);
      return { orders: o.data ?? [], claims: c.data ?? [], wds: w.data ?? [] };
    },
  });
  const run = async (fn: string, args: object, ok: string) => {
    const { error } = await db.rpc(fn, args);
    if (error) toast.error(error.message); else toast.success(ok);
    void qc.invalidateQueries({ queryKey: ["admin-mitady"] });
  };

  return (
    <div className="space-y-4">
      <div className="bsm-card p-4">
        <p className="font-semibold">💸 Commandes Mitady Vola</p>
        {data?.orders.length ? data.orders.map((o: any) => (
          <div key={o.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold">{o.client_name} • {o.phone}</p>
              <p className="text-muted-foreground">{o.service_type} × {o.quantity} — {formatAr(o.price)} • {o.status} • {o.done_count}/{o.quantity}</p>
            </div>
            {o.status !== "processing" ? (
              <Button size="sm" className="bsm-btn bsm-btn-primary" onClick={() => run("approve_boost_order", { _id: o.id }, "Missions créées")}>APPROUVER</Button>
            ) : null}
          </div>
        )) : <p className="mt-2 text-xs text-muted-foreground">Aucune commande.</p>}
      </div>
      <div className="bsm-card p-4">
        <p className="font-semibold">✅ Missions à vérifier ({data?.claims.length ?? 0})</p>
        {data?.claims.map((c: any) => (
          <div key={c.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
            <span>{c.user_id.slice(0, 8)} • {c.reward} Ar</span>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => run("review_mission_claim", { _claim_id: c.id, _approve: true }, "Validé")}>OK</Button>
              <Button size="sm" variant="outline" onClick={() => run("review_mission_claim", { _claim_id: c.id, _approve: false }, "Refusé")}>Refuser</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="bsm-card p-4">
        <p className="font-semibold">🏦 Retraits boosters</p>
        {data?.wds.map((w: any) => (
          <div key={w.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-xs">
            <span>{formatAr(w.amount)} → MVola {w.mvola}</span>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => run("review_booster_withdrawal", { _id: w.id, _approve: true }, "Payé")}>Payé</Button>
              <Button size="sm" variant="outline" onClick={() => run("review_booster_withdrawal", { _id: w.id, _approve: false }, "Refusé")}>Refuser</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
