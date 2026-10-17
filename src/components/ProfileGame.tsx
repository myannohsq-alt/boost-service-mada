import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, Volume2, VolumeX, Camera, Share2, MessageCircle, Pencil } from "lucide-react";
import { DisplayName } from "@/components/AdminBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

const SLICES = [
  { label: "10 Ar", color: "#ff7a1a" },
  { label: "20 Ar", color: "#1e4db7" },
  { label: "30 Ar", color: "#ff7a1a" },
  { label: "10 Ar", color: "#ff7a1a" },
  { label: "50⭐", color: "#1e4db7" },
  { label: "100⭐", color: "#ff7a1a" },
  { label: "150⭐", color: "#1e4db7" },
  { label: "20 Ar", color: "#ff7a1a" },
];

export const level = (pts: number) =>
  pts >= 1000 ? { name: "Or", cls: "bg-primary text-primary-foreground" } : pts >= 300 ? { name: "Argent", cls: "bg-secondary text-foreground" } : { name: "Bronze", cls: "bg-accent text-foreground" };

function useAudio() {
  const ctx = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const tone = (f: number, d: number, at = 0) => {
    if (muted) return;
    ctx.current ??= new AudioContext();
    const c = ctx.current;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = f;
    g.gain.value = 0.08;
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + at);
    o.stop(c.currentTime + at + d);
  };
  return { muted, setMuted, tone };
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ i, left: Math.random() * 100, delay: Math.random() * 0.6, c: i % 2 ? "var(--color-primary)" : "#1e4db7" })), []);
  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
      {bits.map((b) => (
        <span key={b.i} className="absolute top-0 h-2 w-2 rounded-sm" style={{ left: `${b.left}%`, background: b.c, animation: `bsm-fall 1.8s ${b.delay}s ease-in forwards` }} />
      ))}
      <style>{`@keyframes bsm-fall{to{transform:translateY(105vh) rotate(540deg);opacity:.6}}`}</style>
    </div>
  );
}

export function ProfileHeader() {
  const { user, profile, refresh, isAdmin } = useAuth();
  const p = profile as any;
  const [preview, setPreview] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const pts = Number(p?.points ?? 0);
  const lv = level(pts);

  const saveName = async () => {
    const n = draft.trim();
    if (n.length < 3 || n.length > 20) { toast.error("Le nom doit contenir 3 à 20 caractères"); return; }
    if (n.toLowerCase() === "admin" && !isAdmin) { toast.error("Ce nom est réservé"); return; }
    setSaving(true);
    const { error } = await db.rpc("set_display_name", { _name: n });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nom modifié avec succès");
    setEditing(false);
    void refresh();
  };

  const upload = async (f: File) => {
    if (!user) return;
    if (!f.type.startsWith("image/")) { toast.error("Choisissez une image"); return; }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(f);
    const path = `${user.id}/avatar-${Date.now()}.${f.name.split(".").pop() || "jpg"}`;
    const { error } = await supabase.storage.from("uploads").upload(path, f, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
    await supabase.from("profiles").update({ avatar_url: data?.signedUrl ?? "" }).eq("id", user.id);
    toast.success("Photo mise à jour");
    void refresh();
  };

  return (
    <div className="bsm-card flex items-center gap-4 p-4">
      <label className="relative cursor-pointer">
        <img src={preview || p?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p?.name || "M")}`} alt="Photo de profil" className="h-20 w-20 rounded-full border-4 border-primary object-cover" />
        <span className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground"><Camera className="h-3.5 w-3.5" /></span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
      </label>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="space-y-2">
            <input value={draft} maxLength={20} autoFocus onChange={(e) => setDraft(e.target.value)} className="bsm-input !py-2 !text-sm" aria-label="Nouveau nom" />
            <div className="flex gap-2">
              <button disabled={saving} onClick={() => void saveName()} className="bsm-btn bsm-btn-primary !px-3 !py-1.5 !text-xs">{saving ? "..." : "Enregistrer"}</button>
              <button onClick={() => setEditing(false)} className="bsm-btn border border-border !px-3 !py-1.5 !text-xs">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <DisplayName name={p?.name} admin={isAdmin} className="text-lg font-bold" />
            <button aria-label="Modifier le nom" onClick={() => { setDraft(p?.name || ""); setEditing(true); }} className="shrink-0 rounded-full p-1 text-primary hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${lv.cls}`}>{lv.name}</span>
          </div>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground">(modifier le nom ne change pas ton email/login)</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-secondary/60 p-2"><p className="text-muted-foreground">Solde</p><p className="font-bold text-primary">{formatAr(p?.balance ?? 0)}</p></div>
          <div className="rounded-lg bg-secondary/60 p-2"><p className="text-muted-foreground">Points</p><p className="font-bold">{pts} ⭐</p></div>
          <div className="rounded-lg bg-secondary/60 p-2"><p className="text-muted-foreground">Parrainage</p><p className="font-bold">{formatAr(p?.referral_earnings ?? 0)}</p></div>
        </div>
      </div>
    </div>
  );
}

export function InviteCard() {
  const { profile } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => { void db.rpc("invited_count").then(({ data }: any) => setCount(Number(data ?? 0))); }, []);
  const link = profile ? `https://boostmada.app/invite/${profile.referral_code}` : "";
  const text = encodeURIComponent(`Midira amin'ny BOOST SERVICE MADA 🇲🇬 : ${link}`);
  return (
    <div className="bsm-card p-4">
      <p className="font-semibold">🎁 Lien d'invitation</p>
      <p className="text-xs text-muted-foreground">1 ami inscrit = +1 tour gratuit · Amis invités : <strong className="text-primary">{count}</strong></p>
      <input readOnly value={link} className="bsm-input mt-3 !text-xs" onFocus={(e) => e.target.select()} />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button onClick={() => { void navigator.clipboard.writeText(link); toast.success("Lien copié !"); }} className="bsm-btn bsm-btn-primary !py-2 !text-xs"><Copy className="h-3.5 w-3.5" /> Copier</button>
        <a target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} className="bsm-btn !py-2 !text-xs border border-border"><Share2 className="h-3.5 w-3.5" /> Facebook</a>
        <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${text}`} className="bsm-btn !py-2 !text-xs border border-border"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
      </div>
    </div>
  );
}

export function Wheel() {
  const { profile, refresh } = useAuth();
  const p = profile as any;
  const { muted, setMuted, tone } = useAudio();
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [win, setWin] = useState<{ type: string; valeur: number } | null>(null);
  const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  const freeLeft = p?.last_spin_date !== today ? 1 : 0;
  const tours = freeLeft + Number(p?.tours_restants ?? 0);
  const grad = `conic-gradient(${SLICES.map((s, i) => `${s.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(",")})`;

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    const { data, error } = await db.rpc("spin_wheel");
    if (error) { setSpinning(false); toast.error(error.message); return; }
    const target = 360 - (data.slice * 45 + 22.5);
    const next = rot - (rot % 360) + 1440 + target;
    setRot(next);
    const tick = setInterval(() => tone(900, 0.05), 80);
    setTimeout(() => {
      clearInterval(tick);
      if (data.type === "ar") [261, 329, 392].forEach((f, i) => tone(f, 0.18, i * 0.15));
      else [392, 523].forEach((f, i) => tone(f, 0.22, i * 0.18));
      setWin(data);
      setSpinning(false);
      void refresh();
    }, 4000);
  };

  return (
    <div className="bsm-card relative p-4 text-center">
      <div className="flex items-center justify-between">
        <p className="font-semibold">🎡 Roue de la fortune</p>
        <button onClick={() => setMuted(!muted)} aria-label={muted ? "Activer le son" : "Couper le son"} className="rounded-full border border-border p-1.5">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
      </div>
      <p className="text-xs text-muted-foreground">Tours disponibles : <strong className="text-primary">{tours}</strong> · max 30 Ar gagnés/jour</p>
      <div className="relative mx-auto mt-4 h-[260px] w-[260px]">
        <div className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-foreground" />
        <div className="relative h-full w-full rounded-full border-8 border-primary shadow-[0_0_30px_-6px_var(--color-primary)]" style={{ background: grad, transform: `rotate(${rot}deg)`, transition: "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" }}>
          {SLICES.map((s, i) => (
            <span key={i} className="absolute left-1/2 top-1/2 origin-left text-xs font-extrabold text-white" style={{ transform: `rotate(${i * 45 + 22.5 - 90}deg) translateX(58px)` }}>{s.label}</span>
          ))}
        </div>
        <button onClick={() => void spin()} disabled={spinning || tours < 1} className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-primary bg-white text-sm font-black text-[#0a1e4a] disabled:opacity-60">TOUR</button>
      </div>
       <p className="mt-3 text-xs text-muted-foreground">Revenez demain ou invitez un ami pour +1 tour</p>
      {win ? (
        <>
          <Confetti />
          <div className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4" onClick={() => setWin(null)}>
            <div className="bsm-card w-full max-w-xs p-6 text-center">
              <p className="text-3xl">🎉</p>
              <p className="mt-2 text-lg font-bold">Félicitations !</p>
              <p className="mt-1 text-2xl font-black text-primary">{win.type === "ar" ? `+${win.valeur} Ar` : `+${win.valeur} ⭐`}</p>
              <button className="bsm-btn bsm-btn-primary mt-4 w-full">Super !</button>
            </div>
          </div>
        </>
      ) : null}
       <div className="mt-4 border-t border-border pt-4 text-left"><WheelResults /></div>
    </div>
  );
}

const ago = (d: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};

export function WheelResults() {
  const [tab, setTab] = useState<"day" | "week">("day");
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - (tab === "day" ? 1 : 7) * 86400e3).toISOString();
    void db.rpc("recent_wheel_wins", { _since: since, _limit: 15 }).then(({ data }: any) => setRows(data ?? []));
  }, [tab]);
  return (
     <div>
      <div className="flex gap-2">
        {(["day", "week"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{t === "day" ? "Aujourd'hui" : "Semaine"}</button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 text-xs">
            <img src={r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.author_name)}`} alt="" className="h-5 w-5 rounded-full object-cover" />
            <span className="font-semibold">{r.author_name}</span>
            <span className="text-muted-foreground">a gagné {r.type === "ar" ? `${r.valeur} Ar` : `${r.valeur} ⭐`}</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{ago(r.created_at)}</span>
          </div>
        ))}
        {!rows.length ? <p className="text-xs text-muted-foreground">Aucun tour pour le moment. Soyez le premier !</p> : null}
      </div>
    </div>
  );
}

function nextSaturday() {
  const now = Date.now();
  const tana = new Date(now + 3 * 3600e3);
  const d = new Date(Date.UTC(tana.getUTCFullYear(), tana.getUTCMonth(), tana.getUTCDate(), 15, 0, 0));
  const add = (6 - tana.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  if (d.getTime() <= now) d.setUTCDate(d.getUTCDate() + 7);
  return d.getTime();
}

export function SaturdayDraw() {
  const { user } = useAuth();
  const [left, setLeft] = useState(nextSaturday() - Date.now());
  const [all, setAll] = useState(false);
  const [board, setBoard] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  useEffect(() => { const t = setInterval(() => setLeft(nextSaturday() - Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => {
    void db.rpc("leaderboard", { _limit: all ? 50 : 8 }).then(({ data }: any) => setBoard(data ?? []));
    void db.rpc("recent_saturday_winners", { _limit: 3 }).then(({ data }: any) => setWinners(data ?? []));
  }, [all]);
  const s = Math.max(0, Math.floor(left / 1000));
  const parts = [["j", Math.floor(s / 86400)], ["h", Math.floor((s % 86400) / 3600)], ["min", Math.floor((s % 3600) / 60)], ["s", s % 60]] as const;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 text-center text-[#0a1e4a]" style={{ background: "linear-gradient(135deg,#ff7a1a,#ffc93c)" }}>
        <p className="text-sm font-black">🏆 Tirage Samedi 18h</p>
        <div className="mt-2 flex justify-center gap-2">
          {parts.map(([u, v]) => <div key={u} className="min-w-12 rounded-lg bg-white/35 px-2 py-1"><p className="text-xl font-black">{v}</p><p className="text-[10px] font-bold">{u}</p></div>)}
        </div>
        <p className="mt-2 text-xs font-bold">300 Ar gratuit pour celui qui a le plus de ⭐</p>
      </div>
      <div className="bsm-card p-4">
         <p className="font-semibold">🥇 Gagnants du samedi + classement</p>
        {winners.map((w) => <p key={w.id} className="mt-1 text-xs">{new Date(w.week_date).toLocaleDateString("fr-FR")} — <strong>{w.author_name}</strong> · {w.points} ⭐ · {w.gain} Ar</p>)}
        {!winners.length ? <p className="mt-1 text-xs text-muted-foreground">Premier tirage samedi prochain.</p> : null}
         <table className="mt-3 w-full text-xs"><tbody>
           {board.map((r, i) => (
             <tr key={r.id} className={r.id === user?.id ? "bg-primary/20" : ""}>
               <td className="py-1.5 pl-1 font-bold">{i + 1}</td>
               <td><img src={r.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(r.name)}`} alt="" className="h-6 w-6 rounded-full object-cover" /></td>
               <td className="font-semibold">{r.name}{r.id === user?.id ? " (vous)" : ""}</td>
               <td className="pr-1 text-right font-bold">{r.points} ⭐</td>
             </tr>
           ))}
         </tbody></table>
         <button onClick={() => setAll(!all)} className="mt-2 text-xs text-primary">{all ? "Réduire" : "Voir tout"}</button>
      </div>
    </div>
  );
}
