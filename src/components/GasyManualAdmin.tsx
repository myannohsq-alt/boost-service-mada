import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Row = { id: string; name_fr: string; active: boolean };

/** Admin ON/OFF for the manual Facebook Gasy services (Followers / Réactions). */
export function GasyManualAdmin({ onDone }: { onDone: (m: string) => void }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["gasy-services"],
    queryFn: async () =>
      ((await supabase.from("services").select("id, name_fr, active").eq("platform", "facebook").in("name_fr", ["Followers Gasy", "Réactions Gasy", "Réactions Gasy (1K)"])).data ?? []) as Row[],
  });
  const groups = [
    { label: "👥 Followers Gasy", rows: data.filter((r) => r.name_fr.startsWith("Followers")) },
    { label: "❤️ Réactions Gasy", rows: data.filter((r) => r.name_fr.startsWith("Réactions")) },
  ];
  async function toggle(rows: Row[], on: boolean) {
    const { error } = await supabase.from("services").update({ active: on }).in("id", rows.map((r) => r.id));
    onDone(error ? `❌ ${error.message}` : on ? "✅ Activé" : "⛔ Désactivé");
    await qc.invalidateQueries({ queryKey: ["gasy-services"] });
    await qc.invalidateQueries({ queryKey: ["admin-services"] });
  }
  return (
    <div className="bsm-card p-4">
      <p className="font-semibold">🇲🇬 Boost Facebook Gasy — Manuel ✋</p>
      <p className="mt-1 text-xs text-muted-foreground">Ny commande rehetra dia ataon'ny Admin amin'ny tanana (tsy alefa any amin'ny SMMGen).</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {groups.map((g) => {
          const on = g.rows.some((r) => r.active);
          return (
            <div key={g.label} className="flex items-center justify-between rounded-lg bg-secondary p-3">
              <span className="text-sm font-semibold">{g.label}</span>
              <button
                disabled={!g.rows.length}
                onClick={() => void toggle(g.rows, !on)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}
              >
                {on ? "✅ Activé" : "⛔ Désactivé"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
