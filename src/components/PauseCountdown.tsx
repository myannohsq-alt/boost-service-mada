import { useEffect, useState } from "react";

export function PauseCountdown({ until, label }: { until: Date; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const ms = Math.max(0, until.getTime() - now);
  const h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="rounded-2xl border border-primary/50 bg-card p-4 text-center">
      <p className="text-2xl">⏸️</p>
      <p className="mt-1 text-sm font-bold">{label} : dépôt suspendu temporairement</p>
      <p className="text-[11px] text-muted-foreground">Réseau en maintenance — n'envoyez pas d'argent maintenant. Mihidy vetivety ny dépôt.</p>
      <div className="mt-3 flex justify-center gap-2 font-mono">
        {[["h", h], ["min", m], ["s", s]].map(([u, v]) => (
          <div key={u as string} className="min-w-14 rounded-xl bg-secondary px-2 py-2">
            <p className="text-2xl font-extrabold bsm-neon-text">{p(v as number)}</p>
            <p className="text-[10px] text-muted-foreground">{u}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px]">Réouverture à {until.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  );
}
