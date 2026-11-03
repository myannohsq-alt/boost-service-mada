import { useEffect, useState } from "react";

const MIN = 2129;
const MAX = 11738;

/** Displayed online counter (simulated, as requested by the site owner). */
export function OnlineNow() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    // Base varies with time of day so it feels natural (peak in the evening).
    const h = new Date().getHours();
    const peak = Math.max(0, 1 - Math.abs(h - 20) / 12);
    setN(Math.round(MIN + 300 + peak * (MAX - MIN - 2000) + Math.random() * 400));
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setN((v) => {
        const cur = v ?? MIN;
        const next = cur + Math.floor(Math.random() * 9) - 5;
        return Math.min(MAX, Math.max(MIN, next));
      });
      t = setTimeout(tick, 5000 + Math.random() * 3000);
    };
    t = setTimeout(tick, 5000);
    return () => clearTimeout(t);
  }, []);
  if (n === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {n.toLocaleString("fr-FR")} en ligne
    </span>
  );
}
