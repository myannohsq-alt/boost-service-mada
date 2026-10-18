import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

const db = supabase as unknown as { from: (t: string) => any; rpc: (f: string, a?: object) => any };

export const Route = createFileRoute("/mitady-vola")({
  head: () => ({
    meta: [
      { title: "Mitady Vola amin'ny Facebook — BOOST MADA" },
      { name: "description", content: "Communauté BOOST MADA : manaova missions Facebook tsotra ary mahazoa vola MVola. 2 comptes max, tsy mila mot de passe." },
      { property: "og:title", content: "Mitady Vola amin'ny Facebook — BOOST MADA" },
      { property: "og:description", content: "Manaova missions Facebook tsotra ary mahazoa vola MVola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MitadyVola,
});

const card = "rounded-[20px] border border-white/10 bg-[#111D13]/90 p-5 backdrop-blur transition hover:-translate-y-0.5";
const input = "w-full rounded-xl border border-white/10 bg-[#0A0F0A] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#00FF88]/50";
const cta = "w-full rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF9500] py-3 font-black text-black disabled:opacity-50";
const ar = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} Ar`;

const TYPES = [
  { id: "followers", label: "Followers", reward: 15 },
  { id: "likes", label: "Réactions", reward: 10 },
  { id: "comments", label: "Commentaires", reward: 15 },
] as const;
type TypeId = (typeof TYPES)[number]["id"];

function MitadyVola() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"vola" | "missions" | "commande">("vola");
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#0A0F0A] to-[#111D13] text-white" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
        <div className="mx-auto w-full max-w-[480px] space-y-4 p-4">
          <div className="flex rounded-full bg-[#111D13] p-1">
            {([["vola", "Mitady Vola"], ["missions", "Missions"], ["commande", "Commande"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-full py-2 text-sm font-bold ${tab === k ? "bg-[#0A0F0A] text-white" : "text-white/50"}`}>{l}</button>
            ))}
          </div>
          {!user ? (
            <div className={`${card} text-center text-sm`}>
              <p>Midira aloha vao manomboka.</p>
              <Link to="/auth" className={`${cta} mt-3 block`}>Se connecter</Link>
            </div>
          ) : tab === "vola" ? (
            <><Hero /><BoosterForm /><Wallet /></>
          ) : tab === "missions" ? <Missions /> : <ClientOrder />}
        </div>
      </div>
    </Layout>
  );
}

function Hero() {
  return (
    <div className={card}>
      <h1 className="text-[18px] font-bold">MITADY VOLA AMIN'NY FACEBOOK-NAO?</h1>
      <p className="mt-1 text-xs text-white/50">Communauté BOOST MADA - 2 comptes max, sans mot de passe, 100% sécurisé</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {["Ampidiro ny compte FB", "Ataovy ny missions", "Raiso amin'ny MVola"].map((s, i) => (
          <div key={s}>
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF9500] font-black text-black">{i + 1}</span>
            <p className="mt-2 font-semibold text-white/80">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoosterForm() {
  const qc = useQueryClient();
  const [f, setF] = useState({ fb_name: "", fb_link: "", mvola: "" });
  const { data: accts = [] } = useQuery({
    queryKey: ["booster-accounts"],
    queryFn: async () => (await db.from("booster_accounts").select("*").order("created_at")).data ?? [],
  });
  const add = async () => {
    const mvola = f.mvola.replace(/\s/g, "");
    if (f.fb_name.trim().length < 2) return toast.error("Soraty ny anarana FB");
    if (!/^https:\/\//i.test(f.fb_link.trim())) return toast.error("Lien FB manomboka https://");
    if (!/^0\d{9}$/.test(mvola)) return toast.error("Numéro MVola diso (ex: 0341234567)");
    const { error } = await db.from("booster_accounts").insert({ fb_name: f.fb_name.trim(), fb_link: f.fb_link.trim(), mvola });
    if (error) return toast.error(error.message);
    toast.success("Compte voaray ✅");
    setF({ fb_name: "", fb_link: "", mvola: "" });
    void qc.invalidateQueries({ queryKey: ["booster-accounts"] });
    return undefined;
  };
  const remove = async (id: string) => {
    await db.from("booster_accounts").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["booster-accounts"] });
  };
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">👤 Compte booster</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{Math.min(accts.length, 1)}/1</span>
      </div>
      {accts.map((a: any) => (
        <div key={a.id} className="mt-2 flex items-center justify-between rounded-xl bg-[#0A0F0A] px-4 py-2.5 text-sm">
          <span className="truncate">{a.fb_name} • {a.mvola}</span>
          <button onClick={() => remove(a.id)} className="text-xs font-bold text-red-400">Fafana</button>
        </div>
      ))}
      {accts.length >= 1 ? <p className="mt-3 text-sm font-bold text-[#FFD60A]">Compte Facebook 1 ihany isaky ny olona</p> : (
        <div className="mt-3 space-y-2">
          <input className={input} placeholder="Anarana Facebook" maxLength={100} value={f.fb_name} onChange={(e) => setF({ ...f, fb_name: e.target.value })} />
          <input className={input} placeholder="https://facebook.com/..." maxLength={300} value={f.fb_link} onChange={(e) => setF({ ...f, fb_link: e.target.value })} />
          <input className={input} placeholder="MVola 034 XX XXX XX" inputMode="tel" maxLength={14} value={f.mvola} onChange={(e) => setF({ ...f, mvola: e.target.value })} />
          <button onClick={add} className={cta}>Ampidiro</button>
        </div>
      )}
    </div>
  );
}

function Wallet() {
  const qc = useQueryClient();
  const { data: w } = useQuery({
    queryKey: ["booster-wallet"],
    queryFn: async () => (await db.rpc("booster_wallet")).data as { today: number; total: number; pending: number; withdrawn: number } | null,
  });
  const { data: todayCount = 0 } = useQuery({
    queryKey: ["claims-today"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { count } = await db.from("mission_claims").select("id", { count: "exact", head: true }).gte("created_at", start.toISOString());
      return count ?? 0;
    },
  });
  const avail = Number(w?.total ?? 0) - Number(w?.withdrawn ?? 0);
  const prog = Math.min(5, todayCount);
  const withdraw = async () => {
    if (avail < 1000) return toast.error("Retrait minimum 1000 Ar");
    const { error } = await db.rpc("request_booster_withdrawal", { _amount: Math.floor(avail) });
    if (error) return toast.error(error.message);
    toast.success("Fangatahana retrait voaray");
    void qc.invalidateQueries({ queryKey: ["booster-wallet"] });
    return undefined;
  };
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold">💰 Wallet</h2>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">10-15 Ar / mission</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-2xl bg-[#0A0F0A] p-3"><p className="text-white/50">VOLA ANIO</p><p className="mt-1 font-black text-[#00FF88]">{ar(w?.today ?? 0)}</p></div>
        <div className="rounded-2xl bg-[#0A0F0A] p-3"><p className="text-white/50">TOTAL</p><p className="mt-1 font-black">{ar(w?.total ?? 0)}</p></div>
        <div className="rounded-2xl bg-[#0A0F0A] p-3"><p className="text-white/50">EN VERIF</p><p className="mt-1 font-black">{ar(w?.pending ?? 0)}</p></div>
      </div>
      <div className="mt-3 rounded-xl border border-[#00FF88]/20 bg-[#00FF88]/10 p-3 text-xs font-bold">
        Réaction 10Ar | Followers 15Ar | Commentaires 15Ar | Partages 10Ar | Bonus +10Ar si &gt;5 missions/jour
      </div>
      <div className="mt-3 rounded-xl bg-[#0A0F0A] p-3">
        <div className="flex justify-between text-xs"><span>Missions aujourd'hui</span><span className="font-bold">{prog}/5</span></div>
        <div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-[#00FF88]" style={{ width: `${(prog / 5) * 100}%` }} /></div>
        <p className="mt-1.5 text-[10px] text-white/50">{prog >= 5 ? "Bonus 10Ar azo 🎁" : `Encore ${5 - prog} pour bonus 10Ar 🎁`}</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm">Disponible <b className="text-[#00FF88]">{ar(avail)}</b></p>
        <button onClick={withdraw} disabled={avail < 1000} className="rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF9500] px-4 py-2.5 text-sm font-black text-black disabled:opacity-50">↗ Retrait MVola</button>
      </div>
    </div>
  );
}

function Missions() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<string | null>(null);
  const { data: missions = [] } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => (await db.from("missions").select("id,reward,link,kind,order_id").eq("status", "open").order("created_at").limit(500)).data ?? [],
  });
  const groups = new Map<string, { m: any; n: number }>();
  for (const m of missions as any[]) {
    const g = groups.get(m.order_id);
    if (g) g.n++; else groups.set(m.order_id, { m, n: 1 });
  }
  const list = [...groups.values()];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold">🎯 Missions disponibles</h2>
        <span className="rounded-full bg-[#00FF88]/20 px-2.5 py-0.5 text-xs font-bold text-[#00FF88]">{list.length} vaovao</span>
      </div>
      {!list.length ? <div className={`${card} text-center text-xs text-white/50`}>Tsy misy mission amin'izao.</div> : null}
      {list.map(({ m, n }) => {
        const fol = m.kind === "followers";
        const com = m.kind === "comments";
        return (
          <div key={m.id} className={card}>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${fol ? "bg-[#FFD60A]/20 text-[#FFD60A]" : "bg-[#00FF88]/20 text-[#00FF88]"}`}>
                {fol ? "Followers" : com ? "Commentaires 💬" : "Réactions ❤️"} {m.reward}Ar/u
              </span>
              <span className="text-sm font-black text-[#FFD60A]">+{ar(m.reward)}</span>
            </div>
            <p className="mt-2 text-xs text-white/50">{n} {fol ? "Followers • Page Facebook" : com ? "Commentaires • Facebook Post" : "Réactions • Facebook Post"}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={m.link} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 py-2.5 text-center text-sm font-bold">👁️ Voir la publication / Page</a>
              <button onClick={() => setModal(m.id)} className="rounded-xl bg-[#FF7A00] py-2.5 text-sm font-bold text-black">Efa vita? Alefa porofo</button>
            </div>
          </div>
        );
      })}
      {modal ? <ProofModal missionId={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); void qc.invalidateQueries({ queryKey: ["missions"] }); void qc.invalidateQueries({ queryKey: ["booster-wallet"] }); void qc.invalidateQueries({ queryKey: ["claims-today"] }); }} /> : null}
    </div>
  );
}

function ProofModal({ missionId, onClose, onDone }: { missionId: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [still, setStill] = useState(false);
  const [busy, setBusy] = useState(false);
  const pick = (f?: File | null) => {
    if (!f || !f.type.startsWith("image/")) return toast.error("Sary ihany no ekena");
    if (f.size > 5_000_000) return toast.error("Sary 5 Mo max");
    setFile(f); setPreview(URL.createObjectURL(f));
    return undefined;
  };
  const send = async () => {
    if (!file) return toast.error("Ampidiro ny capture d'écran");
    if (!still) return toast.error("Hamarino fa mbola ao ny réaction/follow");
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setBusy(false); return toast.error("Midira aloha"); }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${u.user.id}/proof-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); return toast.error(up.error.message); }
    const { error } = await db.rpc("claim_mission", { _mission_id: missionId, _proof_path: path });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Porofo voaray! Hohamarinina ✅");
    onDone();
    return undefined;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="w-full max-w-[360px] rounded-[20px] border border-white/20 bg-[#111D13] p-5 text-white" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-black">Alefa porofo</h3>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
          className="mt-3 block cursor-pointer rounded-xl border-2 border-dashed border-white/20 p-6 text-center text-sm text-white/50"
        >
          {preview ? <img src={preview} alt="Porofo" className="mx-auto max-h-40 rounded-lg" /> : "Drag & drop capture d'écran ou cliquez pour uploader"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} /> Mbola ao ny réaction-ko / follow-ko
        </label>
        <p className="mt-2 text-[10px] text-[#FFD60A]">⚠️ Hash unique - preuve non réutilisable</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/20 py-2.5 text-sm font-bold">Annuler</button>
          <button onClick={send} disabled={busy} className="rounded-xl bg-[#00FF88] py-2.5 text-sm font-black text-black disabled:opacity-50">Envoyer</button>
        </div>
      </div>
    </div>
  );
}

function ClientOrder() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [link, setLink] = useState("");
  const [types, setTypes] = useState<TypeId[]>(["followers"]);
  const [qty, setQty] = useState(100);
  const [busy, setBusy] = useState(false);
  const { data: orders = [] } = useQuery({
    queryKey: ["my-boost-orders"],
    queryFn: async () => (await db.from("boost_orders").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const toggle = (t: TypeId) => setTypes((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const changeQty = (d: number) => setQty((q) => Math.min(5000, Math.max(100, q + d)));
  const total = types.length * qty * 20;
  const { profile, isAdmin, refresh } = useAuth() as any;
  const bal = Number(profile?.balance ?? 0);
  const lowBal = !isAdmin && (bal < 2000 || bal < total);
  const [proofOrder, setProofOrder] = useState<string | null>(null);
  const submit = async () => {
    const ph = phone.replace(/\s/g, "");
    if (name.trim().length < 2) return toast.error("Soraty ny anarana");
    if (!/^0\d{9}$/.test(ph)) return toast.error("Numéro diso");
    if (!/^https:\/\//i.test(link.trim())) return toast.error("Lien https:// ilaina");
    if (!types.length) return toast.error("Mifidiana karazana iray farafahakeliny");
    if (lowBal) return toast.error("Solde tsy ampy: 2000 Ar farafahakeliny. Mameno solde aloha.");
    setBusy(true);
    const { error } = await db.rpc("place_boost_order", { _name: name.trim(), _phone: ph, _link: link.trim(), _types: types, _qty: qty });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Commande voaray ✅ Efa miseho amin'ny Missions");
    void refresh?.();
    void qc.invalidateQueries({ queryKey: ["my-boost-orders"] });
    void qc.invalidateQueries({ queryKey: ["missions"] });
    return undefined;
  };
  return (
    <div className={card}>
      <h2 className="font-bold">Hanao commande (boost avy amin'ny communauté)</h2>
      <div className="mt-3 space-y-2">
        <input className={input} placeholder="Anarana" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="Téléphone 03X XX XXX XX" inputMode="tel" maxLength={14} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => {
            const on = types.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggle(t.id)} className={`rounded-xl py-2.5 text-sm font-bold ${on ? "bg-[#00FF88] text-black" : "border border-white/10 bg-[#0A0F0A]"}`}>
                {t.label} {t.reward}Ar
              </button>
            );
          })}
          <button disabled className="rounded-xl border border-white/10 bg-[#0A0F0A] py-2.5 text-sm font-bold text-white/30">Partages (tsy ho ela)</button>
        </div>
        <input className={input} placeholder="https://facebook.com/..." maxLength={500} value={link} onChange={(e) => setLink(e.target.value)} />
        <div className="flex gap-2">
          <button onClick={() => changeQty(-100)} className="rounded-xl bg-white/10 px-4 font-black">-</button>
          <div className="flex-1 rounded-xl border border-white/10 bg-[#0A0F0A] py-3 text-center font-black">{qty}</div>
          <button onClick={() => changeQty(100)} className="rounded-xl bg-white/10 px-4 font-black">+</button>
        </div>
        <p className="text-sm font-bold">{types.map((t) => TYPES.find((x) => x.id === t)!.label).join(" + ") || "—"} x {qty} = <span className="text-[#FFD60A]">{ar(total)}</span></p>
        <p className="text-[11px] text-white/50">100=2000Ar | 1000=20000Ar • Booster reçoit 10-15Ar/u selon type + bonus &gt;5/j</p>
        {lowBal ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs font-bold text-red-300">
            Solde tsy ampy ({ar(bal)}). 2 000 Ar farafahakeliny ary {ar(total)} ilaina. <Link to="/depot" className="underline">Mameno solde</Link>
          </p>
        ) : null}
        <button onClick={submit} disabled={busy || lowBal} className={cta}>Commander - {ar(total)}</button>
      </div>
      {orders.map((o: any) => (
        <div key={o.id} className="mt-3 rounded-xl bg-[#0A0F0A] p-3 text-xs">
          <div className="flex justify-between"><span>{o.service_type} × {o.quantity}</span><span className="text-white/50">{o.status === "processing" ? "En cours" : o.status === "completed" ? "Vita ✅" : o.status === "cancelled" ? "Nofoanana" : o.status}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#00FF88]" style={{ width: `${Math.min(100, (o.done_count / o.quantity) * 100)}%` }} /></div>
          <p className="mt-1">{o.done_count}/{o.quantity}</p>
          <button onClick={() => setProofOrder(o.id)} className="mt-2 rounded-lg border border-[#00FF88]/40 px-3 py-1.5 font-bold text-[#00FF88]">📸 Jereo ny porofo</button>
        </div>
      ))}
      {proofOrder ? <ProofsViewer orderId={proofOrder} onClose={() => setProofOrder(null)} /> : null}
    </div>
  );
}
