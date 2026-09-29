import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";

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

const PRICES = { followers: 20, likes: 20, comments: 60 } as const;

function MitadyVola() {
  const { user } = useAuth();
  return (
    <Layout>
      <section className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5">
        <div className="bsm-card p-5 text-center">
          <h1 className="font-display text-xl font-bold sm:text-2xl bsm-neon-text">MITADY VOLA AMIN'NY FACEBOOK-NAO?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Communauté BOOST MADA - 2 comptes max, sans mot de passe, 100% sécurisé</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {["Ampidiro ny compte FB", "Ataovy ny missions", "Raiso amin'ny MVola"].map((s, i) => (
              <div key={s} className="rounded-xl border border-border bg-secondary p-3">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[image:var(--gradient-neon)] font-bold text-primary-foreground">{i + 1}</span>
                <p className="mt-2 font-semibold">{s}</p>
              </div>
            ))}
          </div>
        </div>
        {!user ? (
          <div className="bsm-card p-5 text-center text-sm">
            <p>Midira aloha vao manomboka.</p>
            <Button asChild className="bsm-btn bsm-btn-primary mt-3"><Link to="/auth">Se connecter</Link></Button>
          </div>
        ) : (
          <>
            <BoosterForm />
            <Wallet />
            <Missions />
            <ClientOrder />
          </>
        )}
        <div className="bsm-card p-5 text-sm">
          <h2 className="font-bold">📜 Fitsipika</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Compte Facebook 6 mois+</li>
            <li>50 amis+</li>
            <li>Max 10 missions/jour isaky ny compte</li>
            <li>Com's tena izy fa tsy "ok"</li>
            <li>Afaka mamafa compte amin'ny fotoana rehetra</li>
          </ul>
        </div>
      </section>
    </Layout>
  );
}

function BoosterForm() {
  const qc = useQueryClient();
  const [f, setF] = useState({ fb_name: "", fb_link: "", mvola: "" });
  const { data: accts = [] } = useQuery({
    queryKey: ["booster-accounts"],
    queryFn: async () => (await db.from("booster_accounts").select("*").order("created_at")).data ?? [],
  });
  const full = accts.length >= 2;
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
  };
  const remove = async (id: string) => {
    await db.from("booster_accounts").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["booster-accounts"] });
  };
  return (
    <div className="bsm-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">👤 Compte booster</h2>
        <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-bold">{accts.length}/2</span>
      </div>
      {accts.map((a: any) => (
        <div key={a.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-xs">
          <span className="truncate">{a.fb_name} • {a.mvola}</span>
          <button onClick={() => remove(a.id)} className="text-destructive">Fafana</button>
        </div>
      ))}
      {full ? <p className="mt-3 text-sm font-semibold text-primary">Efa feno 2</p> : (
        <div className="mt-3 space-y-2">
          <input className="bsm-input" placeholder="Anarana Facebook" maxLength={100} value={f.fb_name} onChange={(e) => setF({ ...f, fb_name: e.target.value })} />
          <input className="bsm-input" placeholder="https://facebook.com/..." maxLength={300} value={f.fb_link} onChange={(e) => setF({ ...f, fb_link: e.target.value })} />
          <input className="bsm-input" placeholder="MVola 034 XX XXX XX" inputMode="tel" maxLength={14} value={f.mvola} onChange={(e) => setF({ ...f, mvola: e.target.value })} />
          <Button onClick={add} className="bsm-btn bsm-btn-primary w-full">Ampidiro</Button>
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
  const avail = Number(w?.total ?? 0) - Number(w?.withdrawn ?? 0);
  const withdraw = async () => {
    if (avail < 1000) return toast.error("Retrait minimum 1000 Ar");
    const { error } = await db.rpc("request_booster_withdrawal", { _amount: Math.floor(avail) });
    if (error) return toast.error(error.message);
    toast.success("Fangatahana retrait voaray");
    void qc.invalidateQueries({ queryKey: ["booster-wallet"] });
  };
  return (
    <div className="bsm-card p-5">
      <h2 className="font-bold">💰 Wallet</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">Vola anio</p><p className="text-lg font-bold bsm-neon-text">{formatAr(w?.today ?? 0)}</p></div>
        <div className="rounded-xl bg-secondary p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold bsm-neon-text">{formatAr(w?.total ?? 0)}</p></div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">En vérification : {formatAr(w?.pending ?? 0)} • Disponible : {formatAr(avail)}</p>
      <p className="mt-2 text-xs text-muted-foreground">10Ar/mission followers/likes, 30Ar/mission com's. 10/jour = 100Ar/compte, 200Ar si 2 comptes</p>
      <Button onClick={withdraw} disabled={avail < 1000} className="bsm-btn bsm-btn-primary mt-3 w-full">Retrait (min 1000 Ar)</Button>
    </div>
  );
}

function Missions() {
  const qc = useQueryClient();
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const { data: missions = [] } = useQuery({
    queryKey: ["missions"],
    queryFn: async () => (await db.from("missions").select("id,reward,link,kind,order_id").eq("status", "open").order("created_at").limit(200)).data ?? [],
  });
  // One mission shown per order, a booster can do each order once.
  const list = Object.values(Object.fromEntries(missions.map((m: any) => [m.order_id, m]))) as any[];
  const done = async (id: string) => {
    const { error } = await db.rpc("claim_mission", { _mission_id: id });
    if (error) return toast.error(error.message);
    toast.success("Voaray! Ho hamarinina ny admin");
    void qc.invalidateQueries({ queryKey: ["missions"] });
    void qc.invalidateQueries({ queryKey: ["booster-wallet"] });
  };
  return (
    <div className="bsm-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">🎯 Missions</h2>
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">{list.length} vaovao</span>
      </div>
      {!list.length ? <p className="mt-2 text-xs text-muted-foreground">Tsy misy mission amin'izao.</p> : null}
      {list.slice(0, 20).map((m) => (
        <div key={m.id} className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-xs">
          <span className="font-semibold">{m.kind} • +{m.reward} Ar</span>
          <div className="flex gap-1">
            <a href={m.link} target="_blank" rel="noopener noreferrer" onClick={() => setOpened({ ...opened, [m.id]: true })} className="rounded-md border border-border px-2 py-1">Sokafy</a>
            <Button size="sm" disabled={!opened[m.id]} onClick={() => done(m.id)} className="bsm-btn bsm-btn-primary h-7">Efa vita</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClientOrder() {
  const qc = useQueryClient();
  const [f, setF] = useState({ client_name: "", phone: "", service_type: "followers" as keyof typeof PRICES, link: "", quantity: "100" });
  const { data: orders = [] } = useQuery({
    queryKey: ["my-boost-orders"],
    queryFn: async () => (await db.from("boost_orders").select("*").order("created_at", { ascending: false }).limit(10)).data ?? [],
  });
  const qty = Number(f.quantity);
  const submit = async () => {
    const phone = f.phone.replace(/\s/g, "");
    if (!/^0\d{9}$/.test(phone)) return toast.error("Numéro diso");
    if (!/^https:\/\//i.test(f.link.trim())) return toast.error("Lien https:// ilaina");
    if (!Number.isInteger(qty) || qty < 10 || qty > 5000) return toast.error("Quantité 10 à 5000");
    const { error } = await db.from("boost_orders").insert({ client_name: f.client_name.trim(), phone, service_type: f.service_type, link: f.link.trim(), quantity: qty });
    if (error) return toast.error(error.message);
    toast.success("Commande voaray — ataovy ny paiement");
    void qc.invalidateQueries({ queryKey: ["my-boost-orders"] });
  };
  const paid = async (id: string) => {
    const { error } = await db.rpc("mark_boost_paid", { _id: id });
    if (error) return toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["my-boost-orders"] });
  };
  return (
    <div className="bsm-card p-5">
      <h2 className="font-bold">📦 Hanao commande (boost avy amin'ny communauté)</h2>
      <div className="mt-3 space-y-2">
        <input className="bsm-input" placeholder="Anarana" maxLength={100} value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} />
        <input className="bsm-input" placeholder="Téléphone 03X XX XXX XX" maxLength={14} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <select className="bsm-input" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value as keyof typeof PRICES })}>
          <option value="followers">Followers</option><option value="likes">Likes</option><option value="comments">Com's</option>
        </select>
        <input className="bsm-input" placeholder="https://facebook.com/..." maxLength={500} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} />
        <input className="bsm-input" type="number" min={10} max={5000} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
        <p className="text-sm">Total : <strong className="text-primary">{formatAr((qty || 0) * PRICES[f.service_type])}</strong></p>
        <Button onClick={submit} className="bsm-btn bsm-btn-primary w-full">Commander</Button>
      </div>
      {orders.map((o: any) => (
        <div key={o.id} className="mt-3 rounded-lg bg-secondary p-3 text-xs">
          <div className="flex justify-between"><span>{o.service_type} × {o.quantity}</span><span>{o.status}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full bg-[image:var(--gradient-neon)]" style={{ width: `${Math.min(100, (o.done_count / o.quantity) * 100)}%` }} />
          </div>
          <p className="mt-1">{o.done_count}/{o.quantity}</p>
          {o.status === "pending_payment" ? (
            <Button size="sm" onClick={() => paid(o.id)} className="mt-2">Efa nandoa ({formatAr(o.price)}) — <Link to="/depot" className="underline">numéros</Link></Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
