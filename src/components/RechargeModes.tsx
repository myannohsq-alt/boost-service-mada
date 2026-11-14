import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type RechargeMode = "instant" | "manual";

/** Map of mode -> closed? */
export function useRechargeModes() {
  return useQuery({
    queryKey: ["recharge-modes"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_recharge_modes");
      const map: Record<RechargeMode, boolean> = { instant: false, manual: false };
      for (const r of data ?? []) map[r.method as RechargeMode] = !!r.closed;
      return map;
    },
    refetchInterval: 20_000,
  });
}

const MODES: { id: RechargeMode; title: string; sub: string; Icon: typeof Zap }[] = [
  { id: "instant", title: "Recharge Instantané", sub: "Paiement en ligne, crédit immédiat", Icon: Zap },
  { id: "manual", title: "Recharge Manuel", sub: "Paiement avec preuve", Icon: CreditCard },
];

export function RechargeModePicker({ value, onChange }: { value: RechargeMode; onChange: (m: RechargeMode) => void }) {
  const { data } = useRechargeModes();
  const allClosed = data?.instant && data?.manual;
  return (
    <div className="bsm-card mt-4 p-4">
      <p className="text-center font-display text-lg font-extrabold">Méthode de Paiement</p>
      <p className="mb-3 text-center text-xs text-muted-foreground">Choisissez votre méthode de recharge :</p>
      <div className="grid grid-cols-2 gap-2">
        {MODES.map(({ id, title, sub, Icon }) => {
          const closed = !!data?.[id];
          const on = value === id && !closed;
          return (
            <button key={id} type="button" disabled={closed} aria-pressed={on}
              onClick={() => !closed && onChange(id)}
              className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition active:scale-[0.98] ${
                closed ? "cursor-not-allowed border-border opacity-45 grayscale"
                : on ? "border-primary bg-primary/10 shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
                : "border-border bg-background/40"}`}>
              {closed && (
                <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-destructive/20 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                  <Lock className="h-3 w-3" /> Fermé
                </span>
              )}
              <Icon className={`h-6 w-6 ${on ? "text-primary" : "text-gold"}`} />
              <span className="text-[13px] font-extrabold leading-tight">{title}</span>
              <span className="text-[10px] text-muted-foreground">{sub}</span>
            </button>
          );
        })}
      </div>
      {allClosed && (
        <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-center text-xs font-semibold text-destructive">
          🔒 Les recharges sont momentanément fermées. Réessayez plus tard.
        </p>
      )}
    </div>
  );
}

export function RechargeModesAdmin() {
  const qc = useQueryClient();
  const { data } = useRechargeModes();
  const toggle = async (id: RechargeMode) => {
    const closed = !data?.[id];
    const { error } = await supabase.from("deposit_pauses").update({ closed, updated_at: new Date().toISOString() }).eq("method", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${id === "instant" ? "Recharge Instantané" : "Recharge Manuel"} : ${closed ? "Fermé 🔒" : "Ouvert ✅"}`);
    await qc.invalidateQueries({ queryKey: ["recharge-modes"] });
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold">Méthodes de paiement (Recharge)</p>
      {MODES.map(({ id, title, Icon }) => {
        const closed = !!data?.[id];
        return (
          <div key={id} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-background/40 p-2.5">
            <Icon className="h-4 w-4 text-primary" />
            <span className="flex-1 text-sm font-semibold">{title}</span>
            <button onClick={() => void toggle(id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${closed ? "border border-destructive/60 bg-destructive/15 text-destructive" : "bg-primary text-primary-foreground"}`}>
              {closed ? <><Lock className="h-3.5 w-3.5" /> Fermé</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Ouvert</>}
            </button>
          </div>
        );
      })}
    </div>
  );
}
