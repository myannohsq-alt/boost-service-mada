import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { fulfillNow } from "@/lib/sync-user.functions";

const QTY = [100, 500, 1000, 2000];
const MAX = 2000;
const PRICE = 20;
const BATCH = 200;

async function generateBatch(
  count: number,
  opts: { lang: string; theme: string; topic: string; avoid: string[] },
  onText: (t: string) => void,
) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/comments-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ count, ...opts }),
  });
  if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Erreur IA (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += dec.decode(value, { stream: true });
    onText(out);
  }
  return out;
}

function cleanLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)-]\s*|[-•*]\s*)/, "").replace(/^["«]|["»]$/g, "").trim())
    .filter(Boolean);
}

const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const label = "block text-xs font-semibold";

export function CommentsAiForm({ onClose }: { onClose?: () => void }) {
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
  const billed = count || qty;
  const total = billed * PRICE;
  const balance = Number(profile?.balance ?? 0);

  async function generate() {
    if (theme === "traite") {
      setText(generateTraite(qty).join("\n"));
      toast.success(`${qty} commentaires Traite 🔥 prêts`);
      return;
    }
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
        const out = await generateBatch(need, { lang, theme, topic, avoid: kept.slice(-60) }, (p) =>
          setText((base ? base + "\n" : "") + p),
        );
        for (const l of cleanLines(out)) {
          const k = l.toLowerCase();
          if (seen.has(k) || kept.length >= qty) continue;
          seen.add(k);
          kept.push(l);
        }
        setText(kept.join("\n"));
      }
      toast.success(`${kept.length} commentaires générés ✨`);
    } catch (e) {
      setText(kept.join("\n"));
      toast.error(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function order() {
    if (!/^https:\/\/\S+\.\S+/i.test(link.trim())) return void toast.error("Lien HTTPS invalide");
    if (count < 10) return void toast.error("Générez au moins 10 commentaires");
    if (count > MAX) return void toast.error(`Maximum ${MAX} commentaires`);
    if (balance < total) return void toast.error("Solde insuffisant, rechargez");
    setOrdering(true);
    const { error } = await supabase.rpc("place_comment_order" as never, { _link: link.trim(), _comments: lines.join("\n") } as never);
    setOrdering(false);
    if (error) return void toast.error(error.message);
    fulfillNow({ data: undefined }).catch(() => {});
    await refresh();
    toast.success(`Commande réussie ! Nouveau solde : ${formatAr(Math.max(0, balance - total))}`);
    onClose?.();
    navigate({ to: "/commandes" });
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/60"}`;

  return (
    <div className="space-y-3">
      <h2 id="service-form-title" className="text-lg font-extrabold">Commentaires IA Gasy 🇲🇬</h2>

      <div className="space-y-1">
        <label className={label}>1. Lien de publication</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." className={field} />
      </div>

      <div className="space-y-1">
        <label className={label}>2. Quantité (max {MAX})</label>
        <div className="flex flex-wrap gap-2">
          {QTY.map((q) => (
            <button key={q} type="button" className={pill(qty === q)} onClick={() => setQty(q)}>{q}</button>
          ))}
        </div>
        <input
          type="number"
          min={10}
          max={MAX}
          value={qty}
          onChange={(e) => setQty(Math.min(MAX, Math.max(1, Math.floor(Number(e.target.value) || 0))))}
          className={field}
        />
      </div>

      <div className="space-y-1">
        <label className={label}>3. Langue</label>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className={field}>
          <option value="gasy">Gasy 100%</option>
          <option value="fr">Français</option>
          <option value="mix">Mix Gasy-Français</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={label}>4. Thème</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className={field}>
          <option value="traite">Traite 🔥</option>
          <option value="anniversaire">Anniversaire 🎉</option>
          <option value="vente">Vente</option>
          <option value="felicitations">Félicitations</option>
          <option value="humour">Humour</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={label}>5. Description du post</label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="De quoi parle la publication? Ex: anniversaire 20 ans"
          className={field}
        />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={generate}
        className="w-full rounded-xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? `Génération… ${progress}` : "✨ Générer avec IA les commentaires"}
      </button>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="font-semibold">Commentaires (1 par ligne)</span>
          <span className="font-bold text-primary">{count} commentaires générés</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder="Les commentaires générés apparaîtront ici…"
          className={`${field} font-mono text-xs leading-relaxed`}
        />
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-background p-3 text-sm">
        <div className="flex justify-between"><span>Prix</span><span>20 Ar / commentaire</span></div>
        <div className="flex justify-between"><span>Mon solde</span><b>{formatAr(balance)}</b></div>
        <div className="flex justify-between"><span>Total à payer ({billed} × 20 Ar)</span><b className="bsm-neon-text">{formatAr(total)}</b></div>
      </div>

      <button
        type="button"
        disabled={ordering || busy || count < 10}
        onClick={order}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {ordering ? "Envoi…" : `Commander — ${formatAr(total)}`}
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold">
          Annuler
        </button>
      )}
    </div>
  );
}
