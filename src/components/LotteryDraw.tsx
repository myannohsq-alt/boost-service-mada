import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;
const FEE = 200;

function nextDraw(now = new Date()) {
  // Madagascar = UTC+3 ; tirage 19h30 => 16h30 UTC
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16, 30));
  if (now >= d) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
const mgDate = (d: Date) => new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 10);

export function LotteryDraw() {
  const { user, refresh } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [draws, setDraws] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const target = nextDraw(now);
  const drawDate = mgDate(target);

  async function load() {
    await db.rpc("settle_lottery");
    const [e, d] = await Promise.all([
      db.from("lottery_entries").select("user_id,author_name,amount,created_at").eq("draw_date", drawDate).order("created_at"),
      db.from("lottery_draws").select("*").order("draw_date", { ascending: false }).limit(10),
    ]);
    setEntries(e.data ?? []);
    setDraws(d.data ?? []);
  }
  useEffect(() => { void load(); }, [drawDate]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const left = Math.max(0, target.getTime() - now.getTime());
  const hh = String(Math.floor(left / 3600e3)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600e3) / 60e3)).padStart(2, "0");
  const ss = String(Math.floor((left % 60e3) / 1e3)).padStart(2, "0");
  const prize = entries.reduce((s, x) => s + (Number(x.amount) || FEE), 0);
  const joined = entries.some((x) => x.user_id === user?.id);

  async function join() {
    setBusy(true);
    const { error } = await db.rpc("join_lottery");
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("🎟️ Tafiditra ianao! +10 ⭐ — Mirary vintana 🍀");
    await Promise.all([load(), refresh()]);
  }

  const colors = ["var(--primary)", "var(--gold, #FFB800)", "#3B82F6", "#06B6D4", "#F97316", "#6366F1"];
  const n = entries.length;
  const wheelBg = n
    ? `conic-gradient(${entries.map((_, i) => `${colors[i % colors.length]} ${(i / n) * 360}deg ${((i + 1) / n) * 360}deg`).join(",")})`
    : "conic-gradient(var(--secondary) 0deg 360deg)";

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/40 bg-card">
      <div className="bg-gradient-to-br from-primary/25 via-card to-card p-5 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">🎰 Lalao azahoana Solde</p>
        <h3 className="mt-1 font-display text-xl font-bold text-foreground">🏆 Tirage isan'andro 19h30</h3>

        <div className="mt-4 rounded-xl border border-primary/30 bg-background/40 p-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Loka ho an'ilay mpandresy 🏆</p>
          <p className="font-display text-4xl font-black text-primary drop-shadow">{formatAr(prize)}</p>
          <p className="text-[11px] text-muted-foreground">Totalin'ny fandraisana anjara rehetra • {n} mpandray anjara</p>
        </div>

        <div className="relative mx-auto mt-5 h-56 w-56">
          <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-primary" />
          <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-border shadow-2xl" style={{ background: wheelBg }}>
            {entries.map((e, i) => {
              const angle = ((i + 0.5) / n) * 360;
              return (
                <span
                  key={i}
                  className="absolute left-1/2 top-1/2 max-w-[80px] origin-left truncate text-[11px] font-bold text-white drop-shadow"
                  style={{ transform: `rotate(${angle - 90}deg) translateX(28px)` }}
                >
                  {e.author_name}
                </span>
              );
            })}
          </div>
          <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-primary bg-card text-2xl">🎟️</div>
        </div>

        <div className="mx-auto mt-4 flex max-w-xs justify-center gap-2">
          {[hh, mm, ss].map((v, i) => (
            <div key={i} className="w-16 rounded-xl border border-border bg-background/60 py-2">
              <p className="font-mono text-2xl font-bold text-foreground">{v}</p>
              <p className="text-[10px] uppercase text-muted-foreground">{["ora", "min", "seg"][i]}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1 font-semibold text-foreground">💸 {FEE} Ar</span>
          <span className="rounded-full bg-gold/20 px-3 py-1 font-semibold text-gold">🎁 +10 ⭐ avy hatrany</span>
        </div>
        <button
          onClick={join}
          disabled={busy || joined}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-gold py-3 font-bold text-primary-foreground shadow-lg transition active:scale-95 disabled:opacity-60"
        >
          {joined ? "✅ Efa nandray anjara ianao (+10 ⭐)" : busy ? "…" : `🎟️ Handray anjara (${FEE} Ar)`}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">Olona 1 tsara vintana no mahazo ny loka manontolo, alefa avy hatrany ao amin'ny solde.</p>
      </div>

      <div className="border-t border-border p-4">
        <p className="mb-2 text-sm font-bold text-foreground">👥 Mpandray anjara androany</p>
        {entries.length ? (
          <div className="flex flex-wrap gap-1.5">
            {entries.map((e, i) => (
              <span key={i} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-foreground">{e.author_name}</span>
            ))}
          </div>
        ) : <p className="text-xs text-muted-foreground">Mbola tsy misy. Ianao no voalohany!</p>}
      </div>

      <div className="border-t border-border p-4">
        <p className="mb-2 text-sm font-bold text-foreground">📜 Historique</p>
        {draws.length ? (
          <ul className="space-y-1.5">
            {draws.map((d) => (
              <li key={d.draw_date} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-xs">
                <span className="text-muted-foreground">{d.draw_date}</span>
                <span className="font-semibold text-foreground">🏆 {d.winner_name}</span>
                <span className="text-primary">{formatAr(d.prize)} • {d.participants} 👥</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-muted-foreground">Mbola tsy nisy tirage.</p>}
      </div>
    </div>
  );
}
