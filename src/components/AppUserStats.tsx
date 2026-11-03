import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppUserStats() {
  const { data } = useQuery({
    queryKey: ["app-user-stats"],
    queryFn: async () => (await supabase.rpc("app_user_stats")).data as Record<string, number> | null,
    refetchInterval: 60_000,
  });
  const rows: [string, string][] = [
    ["users", "👥 Mpampiasa rehetra"],
    ["push_users", "📲 Notifications APK/téléphone"],
    ["new_today", "🆕 Vaovao (24h)"],
    ["active_7d", "🛒 Nanao commande (7j)"],
  ];
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-2.5">
      {rows.map(([k, l]) => (
        <div key={k} className="rounded-lg bg-secondary/50 p-2">
          <p className="text-[10px] text-muted-foreground">{l}</p>
          <p className="text-lg font-bold">{(data?.[k] ?? 0).toLocaleString("fr-FR")}</p>
        </div>
      ))}
    </div>
  );
}
