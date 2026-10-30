import { generateTraite, generateHbd, generateVente } from "@/lib/traite-comments";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { fulfillNow } from "@/lib/sync-user.functions";

const QTY = [100, 500, 1000];
const MIN = 100;
const MAX = 2000;
const PRICE = 20;
const TONES = [
  { key: "traite", label: "Traite🔥", gen: generateTraite },
  { key: "hbd", label: "Hdb✨🎂", gen: generateHbd },
  { key: "vente", label: "Vente🎀🎀", gen: generateVente },
] as const;

const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const label = "block text-xs font-semibold text-muted-foreground";

export function CommentsAiForm({ onClose }: { onClose?: () => void }) {
  const { profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [link, setLink] = useState("");
  const [qtyText, setQtyText] = useState("100");
  const [tone, setTone] = useState<(typeof TONES)[number]["key"]>("traite");
  const [ordering, setOrdering] = useState(false);

  const qty = Math.floor(Number(qtyText) || 0);
  const validQty = qty >= MIN && qty <= MAX;
  const total = validQty ? qty * PRICE : 0;
  const balance = Number(profile?.balance ?? 0);
  const insufficient = total > balance;

  async function paste() {
    try { setLink((await navigator.clipboard.readText()).trim()); } catch { toast.error("Collez le lien manuellement"); }
  }

  async function order() {
    if (!/^https:\/\/\S+\.\S+/i.test(link.trim())) return void toast.error("Lien HTTPS invalide");
    if (!validQty) return void toast.error(`Quantité entre ${MIN} et ${MAX}`);
    if (insufficient) return void toast.error("Solde insuffisant, rechargez");
    const lines = TONES.find((t) => t.key === tone)!.gen(qty);
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
    `rounded-xl border px-2 py-2.5 text-xs font-bold transition ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`;

  return (
    <div className="space-y-4">
      <h2 id="service-form-title" className="text-lg font-extrabold">Boost Commentaires 💬</h2>

      <div className="space-y-1">
        <span className={label}>Type de Visibilité</span>
        <div className="rounded-xl border border-primary bg-primary/10 py-2 text-center text-sm font-bold text-primary">Comment (teny gasy) 🇲🇬</div>
      </div>

      <div className="space-y-1">
        <span className={label}>Type de commentaire</span>
        <div className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button key={t.key} type="button" aria-pressed={tone === t.key} className={pill(tone === t.key)} onClick={() => setTone(t.key)}>{t.label}</button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">💬 Des commentaires 100% adaptés à ce ton seront envoyés automatiquement.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="ca-link" className={label}>Lien Facebook (URL)</label>
        <div className="flex gap-2">
          <input id="ca-link" value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" placeholder="Copier le lien Facebook ici." className={field} />
          <button type="button" onClick={paste} className="rounded-lg border border-border bg-secondary px-3 text-xs font-semibold">Coller</button>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="ca-qty" className={label}>Quantité (min. {MIN})</label>
        <input id="ca-qty" type="number" min={MIN} max={MAX} value={qtyText} onChange={(e) => setQtyText(e.target.value)} className={field} />
        <div className="grid grid-cols-3 gap-2">
          {QTY.map((q) => (
            <button key={q} type="button" className={pill(qty === q)} onClick={() => setQtyText(String(q))}>{q}</button>
          ))}
        </div>
        {!validQty && <p className="text-[11px] text-destructive">Quantité entre {MIN} et {MAX}</p>}
      </div>

      <div className="space-y-1 rounded-lg border border-border bg-secondary p-3 text-sm">
        <div className="flex justify-between"><span>Mon solde</span><b className="text-primary">{formatAr(balance)}</b></div>
        <div className="flex justify-between border-t border-border pt-2"><span>Sarany 💵</span><b className="text-lg text-primary">{formatAr(total)}</b></div>
      </div>

      <button
        type="button"
        disabled={ordering || !validQty || insufficient}
        onClick={order}
        className="bsm-btn bsm-btn-primary h-12 w-full rounded-xl text-base font-bold disabled:opacity-50"
      >
        {ordering ? "Envoi…" : insufficient ? "Solde insuffisant" : `Commander — ${formatAr(total)}`}
      </button>
      {onClose && (
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold">Annuler</button>
      )}
    </div>
  );
}
