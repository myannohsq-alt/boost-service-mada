import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Minus, Plus, CheckCircle2, PauseCircle, Landmark, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const LABELS: Record<string, string> = { mvola: "MVola", orange: "Orange Money", airtel: "Airtel Money" };
const STEP = 5;

export function useDepositPauses() {
  return useQuery({
    queryKey: ["deposit-pauses"],
    queryFn: async () => {
      const { data } = await supabase.from("deposit_pauses").select("method, paused_until");
      const map: Record<string, Date | null> = {};
      for (const r of data ?? []) {
        const d = r.paused_until ? new Date(r.paused_until) : null;
        map[r.method] = d && d > new Date() ? d : null;
      }
      return map;
    },
    refetchInterval: 30_000,
  });
}

export function DepositPauseAdmin() {
  const qc = useQueryClient();
  const { data } = useDepositPauses();
  const [mins, setMins] = useState<Record<string, number>>({ mvola: 5, orange: 5, airtel: 5 });
  const set = async (method: string, minutes: number | null) => {
    const until = minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : null;
    const { error } = await supabase
      .from("deposit_pauses")
      .update({ paused_until: until, updated_at: new Date().toISOString() })
      .eq("method", method);
    if (error) { toast.error(error.message); return; }
    toast.success(minutes ? `${LABELS[method]} suspendu ${minutes} min` : `${LABELS[method]} réactivé`);
    await qc.invalidateQueries({ queryKey: ["deposit-pauses"] });
  };
  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-primary/50 bg-card p-4 shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
      <p className="flex items-center gap-2 text-sm font-bold"><Landmark className="h-5 w-5 text-primary" /> Suspendre les dépôts par opérateur</p>
      {Object.keys(LABELS).map((m) => {
        const until = data?.[m];
        const v = mins[m] ?? STEP;
        return (
          <div key={m} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-background/40 p-2.5">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{LABELS[m]}</span>
            <button aria-label="Moins 5 minutes" onClick={() => setMins((s) => ({ ...s, [m]: Math.max(STEP, v - STEP) }))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary"><Minus className="h-4 w-4" /></button>
            <span className="min-w-[64px] rounded-full border-2 border-primary px-2 py-1 text-center text-xs font-bold tabular-nums">{String(v).padStart(2, "0")} min</span>
            <button aria-label="Plus 5 minutes" onClick={() => setMins((s) => ({ ...s, [m]: v + STEP }))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary"><Plus className="h-4 w-4" /></button>
            {until ? (
              <button onClick={() => void set(m, null)} title="Réactiver"
                className="flex items-center gap-1 rounded-full border border-destructive/60 bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive">
                <PauseCircle className="h-4 w-4" /> {until.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </button>
            ) : (
              <button onClick={() => void set(m, v)} title={`Suspendre ${v} min`}
                className="flex items-center gap-1 rounded-full border border-primary/60 bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                <CheckCircle2 className="h-4 w-4" /> Actif
              </button>
            )}
          </div>
        );
      })}
      <div className="flex gap-2 rounded-xl border border-border bg-background/40 p-3 text-[11px] text-muted-foreground">
        <Lightbulb className="h-5 w-5 shrink-0 text-gold" />
        <p><span className="font-bold text-primary">Exemple :</span> appuyez sur <b>+</b> pour 10, 15, 20 min… ou <b>−</b> pour revenir. Puis appuyez sur <b>Actif</b> pour suspendre. Appuyez sur l'heure rouge pour réactiver.</p>
      </div>
    </div>
  );
}
