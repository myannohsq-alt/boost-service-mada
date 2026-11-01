import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Trophy, Star, Play, History, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;
const FEE = 200;
// Clockwise from the top pointer; must match play_wheel_game() on the server.
const SEGMENTS = [
  { type: "trophy", value: 100, label: "100", icon: "🏆" },
  { type: "ar", value: 5, label: "5 Ar", icon: "💵" },
  { type: "star", value: 100, label: "100", icon: "⭐" },
  { type: "trophy", value: 50, label: "50", icon: "🏆" },
  { type: "ar", value: 20, label: "20 Ar", icon: "💵" },
  { type: "star", value: 50, label: "50", icon: "⭐" },
] as const;
const SEG_BG = [
  "var(--primary)",
  "color-mix(in oklab, var(--primary) 35%, var(--card))",
  "var(--gold)",
  "color-mix(in oklab, var(--gold) 35%, var(--card))",
  "color-mix(in oklab, var(--primary) 70%, var(--gold))",
  "color-mix(in oklab, var(--card) 60%, var(--primary))",
];

/** Weekly close: Saturday 18:00 Madagascar = 15:00 UTC. */
function weekEnd(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15));
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7));
  if (d <= now) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}
const prizeText = (t: string, v: number) => t === "ar" ? `${v} Ar` : `${v} ${t === "trophy" ? "🏆" : "⭐"}`;

export function WheelGame() {
  const { user, refresh } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [rot, setRot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [board, setBoard] = useState<any[]>([]);
  const [spins, setSpins] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [tab, setTab] = useState<"hist" | "top">("hist");
  const [showAll, setShowAll] = useState(false);

  async function load() {
    await db.rpc("settle_game_weeks");
    const [b, s, w] = await Promise.all([
      db.rpc("game_week_board", { _limit: 50 }),
      db.rpc("game_recent_spins", { _limit: 100 }),
      db.rpc("game_recent_winners", { _limit: 3 }),
    ]);
    setBoard(b.data ?? []); setSpins(s.data ?? []); setWinners(w.data ?? []);
  }
  useEffect(() => { if (user) void load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const end = weekEnd(now);
  const left = Math.max(0, end.getTime() - now.getTime());
  const dd = Math.floor(left / 86400e3);
  const hh = String(Math.floor((left % 86400e3) / 3600e3)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600e3) / 60e3)).padStart(2, "0");
  const ss = String(Math.floor((left % 60e3) / 1e3)).padStart(2, "0");

  async function play() {
    if (!user) return void toast.error("Midira aloha");
    setBusy(true);
    const { data, error } = await db.rpc("play_wheel_game");
    if (error) { setBusy(false); return void toast.error(error.message); }
    const center = data.segment * 60 + 30;
    setRot((r) => r - (r % 360) + 360 * 6 + (360 - center));
    window.setTimeout(async () => {
      setBusy(false);
      toast.success(`🎉 Nahazo ${prizeText(data.type, data.value)} ianao!`);
      await Promise.all([load(), refresh()]);
    }, 4200);
  }

  const totals = board.reduce((a, r) => ({ t: a.t + r.trophies, s: a.s + r.stars, ar: a.ar + r.ar }), { t: 0, s: 0, ar: 0 });
  const me = board.find((r) => r.is_me);
  const wheelBg = `conic-gradient(${SEG_BG.map((c, i) => `${c} ${i * 60}deg ${(i + 1) * 60}deg`).join(",")})`;

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/50 bg-card shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_25%,transparent)]">
      <div className="bg-gradient-to-br from-primary/25 via-card to-card p-4">
        <p className="mx-auto w-fit rounded-full border border-primary/40 bg-background/50 px-4 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">📣 Lalao azahoana Solde</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-gold drop-shadow" />
          <h3 className="font-display text-3xl font-black text-foreground">Samedi <span className="text-primary">18h</span></h3>
          <Clock className="h-7 w-7 text-gold" />
        </div>
        <p className="mx-auto mt-1 w-fit rounded-full bg-gradient-to-r from-primary to-gold px-3 py-1 text-[11px] font-bold text-primary-foreground">⭐ Loka lehibe sy maro amin'ny participation!</p>
        <p className="mt-2 text-center text-xs text-muted-foreground">Fifaninanana mifarana afaka <b className="tabular-nums text-foreground">{dd}j {hh}:{mm}:{ss}</b> — miverina 0 ny isa rehetra isaky ny herinandro</p>

        <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-xl border border-primary/40 bg-background/50 p-3 text-center">
            <p className="text-[11px] font-bold text-primary">Fandraisana anjara</p>
            <p className="font-display text-2xl font-black">{formatAr(FEE)}</p>
            <button disabled={busy} onClick={() => void play()}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-gold px-3 py-2 text-sm font-extrabold text-primary-foreground shadow-md active:scale-95 disabled:opacity-60">
              <Play className="h-4 w-4 fill-current" /> {busy ? "Mihodina…" : "Participer"}
            </button>
            <p className="mt-1 text-[10px] italic text-muted-foreground">Milalao indray isan'andro! 🚀</p>
          </div>

          <div className="relative mx-auto h-44 w-44 sm:h-52 sm:w-52">
            <div className="absolute left-1/2 top-[-10px] z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-gold drop-shadow" />
            <div className="h-full w-full rounded-full border-4 border-gold p-0.5 shadow-[0_0_25px_var(--gold)]">
              <div className="relative h-full w-full rounded-full" style={{ background: wheelBg, transform: `rotate(${rot}deg)`, transition: "transform 4s cubic-bezier(.17,.67,.12,.99)" }}>
                {SEGMENTS.map((s, i) => (
                  <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 60 + 30}deg)` }}>
                    <div className="mx-auto mt-2 flex w-12 flex-col items-center text-center leading-none text-foreground" style={{ textShadow: "0 1px 3px var(--background)" }}>
                      <span className="text-base">{s.icon}</span>
                      <span className="text-xs font-black">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-gold bg-card text-[9px] font-black text-gold">👑<span>ADMIN</span></div>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:grid-cols-1">
            <div className="rounded-xl border border-gold/50 bg-background/50 p-2.5 text-center">
              <p className="font-display text-xl font-black text-gold">🏆 1200 Ar</p>
              <p className="text-[10px] text-muted-foreground">Ho an'ny mpandresy 🏆 betsaka indrindra</p>
            </div>
            <div className="rounded-xl border border-gold/50 bg-background/50 p-2.5 text-center">
              <p className="font-display text-xl font-black text-gold">⭐ 1000 Ar</p>
              <p className="text-[10px] text-muted-foreground">Ho an'ny mpandresy ⭐ betsaka indrindra</p>
            </div>
            <div className="col-span-2 rounded-xl border border-primary/40 bg-background/50 p-2 text-center sm:col-span-1">
              <p className="text-sm font-black text-primary">🥉 3ème place : 500 Ar</p>
              <p className="text-[10px] text-muted-foreground">Ho an'ny nahazo Ariary betsaka indrindra</p>
            </div>
          </div>
        </div>
        {me && <p className="mt-3 text-center text-xs">Ny anao tamin'ity herinandro ity : <b className="text-primary">🏆 {me.trophies} · ⭐ {me.stars} · {me.ar} Ar</b></p>}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTab("hist")} className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-extrabold ${tab === "hist" ? "bg-gradient-to-r from-primary to-gold text-primary-foreground" : "border border-border bg-secondary"}`}><History className="h-4 w-4" /> Historique</button>
          <button onClick={() => setTab("top")} className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-extrabold ${tab === "top" ? "bg-gradient-to-r from-primary to-gold text-primary-foreground" : "border border-border bg-secondary"}`}><BarChart3 className="h-4 w-4" /> Top Score</button>
        </div>

        {tab === "hist" ? (
          <div className="mt-3 rounded-xl border border-primary/30 bg-background/40">
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-3 py-2 text-[11px] font-bold text-primary"><span>Anarana</span><span>Nandray anjara</span><span className="w-16 text-right">Loka azony</span></div>
            {spins.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Mbola tsy misy nandray anjara tamin'ity herinandro ity.</p>}
            {(showAll ? spins : spins.slice(0, 6)).map((s) => (
              <div key={s.id} className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border/50 px-3 py-2 text-xs ${s.is_me ? "bg-primary/10" : ""}`}>
                <span className="flex min-w-0 items-center gap-2"><Avatar url={s.avatar_url} name={s.author_name} /><span className="truncate font-semibold">{s.author_name}</span></span>
                <span className="text-muted-foreground">{FEE} Ar</span>
                <span className="w-16 text-right font-bold text-gold">{prizeText(s.prize_type, s.value)}</span>
              </div>
            ))}
            {spins.length > 6 && <button onClick={() => setShowAll((v) => !v)} className="mx-auto my-2 block rounded-full border border-primary px-4 py-1 text-xs font-bold text-primary">{showAll ? "Afeno ↑" : "Voir plus… ↓"}</button>}
          </div>
        ) : (
          <div className="mt-3 space-y-1.5 rounded-xl border border-primary/30 bg-background/40 p-2">
            {board.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">Mbola tsy misy score.</p>}
            {board.slice(0, 10).map((r, i) => (
              <div key={r.user_id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${r.is_me ? "bg-primary/10" : ""}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black ${i < 3 ? "bg-gradient-to-br from-gold to-primary text-primary-foreground" : "border border-border"}`}>{i + 1}</span>
                <Avatar url={r.avatar_url} name={r.author_name} />
                <span className="min-w-0 flex-1 truncate font-semibold">{r.author_name}</span>
                <span className="text-[10px] text-muted-foreground">🏆{r.trophies} ⭐{r.stars} 💵{r.ar}</span>
                <span className="font-black text-gold">{r.score} pts</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Participants" value={String(board.length)} />
          <Stat label="Total 🏆" value={String(totals.t)} />
          <Stat label="Total ⭐" value={String(totals.s)} />
        </div>

        {winners.length > 0 && (
          <div className="mt-3 rounded-xl border border-gold/40 bg-background/40 p-3 text-xs">
            <p className="mb-1 font-bold text-gold">🏅 Mpandresy herinandro farany</p>
            {winners.map((w) => (
              <p key={w.id} className="flex justify-between"><span>{w.category === "trophy" ? "🏆" : w.category === "star" ? "⭐" : "💵"} {w.author_name} ({w.score})</span><b className="text-primary">+{w.prize} Ar</b></p>
            ))}
          </div>
        )}
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground"><Star className="h-3 w-3 text-gold" /> Ny loka azo amin'ny lalao ihany no isaina, tsy ny isa ao amin'ny profil.</p>
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url?: string; name: string }) {
  return url
    ? <img src={url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{name?.[0]?.toUpperCase() ?? "?"}</span>;
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-primary/30 bg-background/40 p-2"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-display text-lg font-black text-gold">{value}</p></div>;
}
