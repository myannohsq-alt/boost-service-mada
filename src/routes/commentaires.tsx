import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { fulfillNow } from "@/lib/sync-user.functions";

export const Route = createFileRoute("/commentaires")({
  head: () => ({
    meta: [
      { title: "Commentaires Gasy IA — BOOST SERVICE MADA" },
      { name: "description", content: "Générez des commentaires Facebook en Malagasy avec l'IA et commandez-les en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Commentaires Gasy IA — BOOST SERVICE MADA" },
      { property: "og:description", content: "Commentaires uniques en Gasy, Français ou Mix, 2 000 Ar / 100." },
    ],
  }),
  component: () => (
    <Layout>
      <AuthGate>
        <CommentsPage />
      </AuthGate>
    </Layout>
  ),
});

const QTY = [100, 500, 1000, 2000];
const LANGS = [
  { key: "gasy", label: "Gasy 🇲🇬" },
  { key: "fr", label: "Français" },
  { key: "mix", label: "Mix" },
];
const THEMES = [
  { key: "anniversaire", label: "Anniversaire" },
  { key: "varotra", label: "Varotra" },
  { key: "felicitations", label: "Félicitations" },
  { key: "custom", label: "Custom" },
];
const BATCH = 500;

async function generateBatch(count: number, opts: { lang: string; theme: string; topic: string; avoid: string[] }, onText: (t: string) => void) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/comments-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ count, ...opts }),
  });
  if (!res.ok || !res.body) {
    const msg = res.status === 402 ? "Crédits IA épuisés" : res.status === 429 ? "Trop de demandes, réessayez dans un instant" : await res.text().catch(() => "");
    throw new Error(msg || `Erreur IA (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n");
    buf = parts.pop() ?? "";
    for (const line of parts) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const ev = JSON.parse(raw);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
          out += ev.delta;
          onText(out);
        } else if (ev.type === "response.failed" || ev.type === "error") {
          throw new Error(ev.error?.message ?? "Erreur IA");
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("Erreur")) throw e;
      }
    }
  }
  return out;
}

function cleanLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)-]\s*|[-•*]\s*)/, "").replace(/^["«]|["»]$/g, "").trim())
    .filter(Boolean);
}

function CommentsPage() {
  const { profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [qty, setQty] = useState(100);
  const [lang, setLang] = useState("gasy");
  const [theme, setTheme] = useState("anniversaire");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [ordering, setOrdering] = useState(false);

  const lines = cleanLines(text);
  const count = lines.length;
  const total = count * 20;
  const balance = Number(profile?.balance ?? 0);

  async function generate() {
    setBusy(true);
    setText("");
    const seen = new Set<string>();
    const kept: string[] = [];
    try {
      let attempts = 0;
      while (kept.length < qty && attempts < Math.ceil(qty / BATCH) + 3) {
        attempts++;
        const need = Math.min(BATCH, qty - kept.length);
        setProgress(`${kept.length} / ${qty}`);
        const base = kept.join("\n");
        const out = await generateBatch(need, { lang, theme, topic, avoid: kept.slice(-60) }, (partial) => {
          setText((base ? base + "\n" : "") + partial);
        });
        for (const l of cleanLines(out)) {
          const k = l.toLowerCase();
          if (seen.has(k) || kept.length >= qty) continue;
          seen.add(k);
          kept.push(l);
        }
        setText(kept.join("\n"));
      }
      setProgress("");
      toast.success(`${kept.length} commentaires générés ✨`);
    } catch (e) {
      setText(kept.join("\n"));
      setProgress("");
      toast.error(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setBusy(false);
    }
  }

  async function order() {
    if (!/^https:\/\/\S+\.\S+/i.test(link.trim())) return toast.error("Lien HTTPS invalide");
    if (count < 10) return toast.error("Générez au moins 10 commentaires");
    if (balance < total) return toast.error("Solde insuffisant, rechargez");
    setOrdering(true);
    const { error } = await supabase.rpc("place_comment_order" as never, { _link: link.trim(), _comments: lines.join("\n") } as never);
    setOrdering(false);
    if (error) return toast.error(error.message);
    fulfillNow({ data: undefined }).catch(() => {});
    await refresh?.();
    toast.success(`Commande réussie ! Nouveau solde : ${formatAr(Math.max(0, balance - total))}`);
    navigate({ to: "/commandes" });
    return undefined;
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60"}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-3 py-5">
      <div>
        <h1 className="text-xl font-extrabold">✨ Commentaires Gasy IA</h1>
        <p className="text-xs text-muted-foreground">2 000 Ar / 100 commentaires · 20 Ar l'unité</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <label className="block text-xs font-semibold">Lien de la publication</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://facebook.com/..." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />

        <label className="block text-xs font-semibold">Quantité</label>
        <div className="flex flex-wrap gap-2">
          {QTY.map((q) => <button key={q} type="button" className={pill(qty === q)} onClick={() => setQty(q)}>{q}</button>)}
        </div>

        <label className="block text-xs font-semibold">Langue</label>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => <button key={l.key} type="button" className={pill(lang === l.key)} onClick={() => setLang(l.key)}>{l.label}</button>)}
        </div>

        <label className="block text-xs font-semibold">Thème</label>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => <button key={t.key} type="button" className={pill(theme === t.key)} onClick={() => setTheme(t.key)}>{t.label}</button>)}
        </div>

        <label className="block text-xs font-semibold">Momba inona ny publication?</label>
        <textarea value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} rows={2} placeholder="ex : Anniversaire 20 ans, gâteau chocolat" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />

        <button type="button" disabled={busy} onClick={generate} className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {busy ? `Génération… ${progress}` : `✨ Générer ${qty} com's ${lang === "gasy" ? "Gasy" : lang === "fr" ? "Français" : "Mix"} avec IA`}
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">Commentaires (1 par ligne, modifiables)</span>
          <span className="text-muted-foreground">{count} ligne(s)</span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} placeholder="Les commentaires générés apparaîtront ici…" className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed" />
        <div className="flex justify-between text-sm">
          <span>Mon solde : <b>{formatAr(balance)}</b></span>
          <span>Total : <b className="bsm-neon-text">{formatAr(total)}</b></span>
        </div>
        <button type="button" disabled={ordering || busy || count < 10} onClick={order} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {ordering ? "Envoi…" : `Commander — ${formatAr(total)}`}
        </button>
      </div>
    </div>
  );
}
