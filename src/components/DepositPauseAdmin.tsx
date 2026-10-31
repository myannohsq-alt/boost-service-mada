import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const LABELS: Record<string, string> = { mvola: "MVola", orange: "Orange Money", airtel: "Airtel Money" };
const DURATIONS = [
  { label: "30 min", min: 30 },
  { label: "1 h", min: 60 },
  { label: "2 h", min: 120 },
  { label: "6 h", min: 360 },
  { label: "24 h", min: 1440 },
];

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
    <div className="bsm-card mb-4 space-y-3 p-4">
      <p className="text-sm font-bold">⏸️ Suspendre les dépôts par opérateur</p>
      {Object.keys(LABELS).map((m) => {
        const until = data?.[m];
        return (
          <div key={m} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{LABELS[m]}</span>
              <span className={until ? "text-destructive" : "text-primary"}>
                {until ? `Suspendu jusqu'à ${until.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "Actif"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button key={d.min} onClick={() => void set(m, d.min)} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                  {d.label}
                </button>
              ))}
              {until ? (
                <button onClick={() => void set(m, null)} className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  ▶ Réactiver
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
