import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fulfillNow } from "@/lib/sync-user.functions";
import type { ServiceGroup } from "@/lib/service-groups";
import { ServiceBadge } from "@/components/ServiceBadge";

const REACTION_CHOICES = [
  { key: "like", label: "Like 👍" },
  { key: "love", label: "J'adore ❤️" },
] as const;

const QUICK = [100, 500, 1000];
const PRICE_PER_100 = 1500;

export function CommentReactionForm({ group, onClose, onOrdered }: {
  group: ServiceGroup;
  onClose: () => void;
  onOrdered?: (() => void) | undefined;
}) {
  const { user, profile, refresh } = useAuth();
  const [link, setLink] = useState("");
  const [personName, setPersonName] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [cible, setCible] = useState<string>("pub");
  const [quantityText, setQuantityText] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = group.options[0]?.service;
  const quantity = Number(quantityText);
  const min = 100;
  const cost = Number.isSafeInteger(quantity) && quantity > 0 ? Math.ceil(quantity / 100 * PRICE_PER_100) : 0;
  const balance = Number(profile?.balance ?? 0);
  const insufficient = cost > balance;

  async function submit() {
    setError(null);
    if (!service) return setError("Service indisponible.");
    let url: URL;
    try { url = new URL(link.trim()); }
    catch { return setError("Entrez un lien valide commençant par https://"); }
    if (url.protocol !== "https:" || !url.hostname.includes("."))
      return setError("Entrez un lien valide commençant par https://");
    const name = personName.trim().replace(/[;\n\r]/g, " ").slice(0, 100);
    if (name.length < 2) return setError("Soraty ny anaran'ny olona (ex: Rakoto).");
    if (!reaction) return setError("Choisissez un type de réaction.");
    if (!Number.isSafeInteger(quantity) || quantity < min)
      return setError(`Quantité minimum : ${min}`);
    if (insufficient) { toast.error("Solde insuffisant, rechargez"); return setError("Solde insuffisant, rechargez"); }
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc("place_order", {
        _service_id: service.id,
        _quantity: quantity,
        _link: url.toString(),
        _promo: "",
        _note: `reaction:${reaction};target:${name};cible:${cible};tier:vazah`,
      });
      if (err) {
        setError(err.message);
        toast.error("Commande refusée", { description: err.message });
        return;
      }
      toast.success(`Commande réussie ! Nouveau solde : ${formatAr(balance - cost)}`, {
        description: `Réaction ${reaction} sur le com's de ${name} × ${quantity} — statut : En cours`,
      });
      try { await fulfillNow({ data: undefined as never }); }
      catch { /* La commande reste en file pour le prochain cycle. */ }
      await refresh();
      onOrdered?.();
      onClose();
    } catch {
      setError("La commande n'a pas pu être envoyée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    try { setLink((await navigator.clipboard.readText()).trim()); } catch { toast.error("Collez le lien manuellement"); }
  }
  const pill = (active: boolean) =>
    `rounded-xl border px-2 py-2.5 text-sm font-bold transition ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`;
  const label = "block text-xs font-semibold text-muted-foreground";

  return <div className="space-y-4">
    <div>
      <ServiceBadge badge={group.badge} />
      <h2 id="service-form-title" className="mt-1 font-display text-lg font-extrabold text-foreground">Commander — Boost Réaction Commentaire</h2>
    </div>
    {!user ? <div className="space-y-3 text-sm">
      <p>Vous devez être connecté pour commander.</p>
      <Button asChild className="bsm-btn bsm-btn-primary w-full"><Link to="/auth">Se connecter</Link></Button>
    </div> : <>
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">Votre solde</span><b className="text-primary">{formatAr(balance)}</b>
      </div>
      <div className="space-y-1">
        <span className={label}>Type de Visibilité</span>
        <div className="rounded-xl border border-primary bg-primary/10 py-2 text-center">
          <div className="text-sm font-bold text-primary">Rapid🔼</div>
          <div className="text-[11px] font-semibold text-primary/80">{PRICE_PER_100} Ar /100</div>
        </div>
      </div>
      <div className="space-y-1">
        <span className={label}>Type de réaction</span>
        <div className="grid grid-cols-2 gap-2">
          {REACTION_CHOICES.map(item => <button key={item.key} type="button" aria-pressed={reaction === item.key}
            onClick={() => setReaction(item.key)} className={pill(reaction === item.key)}>{item.label}</button>)}
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="cr-link" className={label}>Lien Facebook (URL)</label>
        <div className="flex gap-2">
          <input id="cr-link" type="url" value={link} maxLength={500} inputMode="url" onChange={e => setLink(e.target.value)} placeholder="Copier le lien Facebook ici." className="bsm-input" />
          <button type="button" onClick={paste} className="rounded-lg border border-border bg-secondary px-3 text-xs font-semibold">Coller</button>
        </div>
        <p className="text-[11px] text-muted-foreground">Apetraho ny lien mivantana an'ilay commentaire (Partager → Copier le lien).</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="cr-quantity" className={label}>Quantité (min. {min})</label>
        <input id="cr-quantity" type="number" min={min} step="1" value={quantityText} onChange={e => setQuantityText(e.target.value)} className="bsm-input" />
        <div className="grid grid-cols-3 gap-2">
          {QUICK.map(value => <button key={value} type="button" aria-pressed={quantity === value}
            onClick={() => setQuantityText(String(value))} className={pill(quantity === value)}>{value}</button>)}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm">
        <span>Sarany 💵</span><b className="text-lg text-primary">{cost ? formatAr(cost) : "—"}</b>
      </div>
      {insufficient && <p className="text-xs text-destructive">Solde insuffisant. <Link to="/recharge" className="underline">Recharger</Link></p>}
      {error && <p role="alert" className="rounded-md bg-secondary p-2 text-xs text-destructive">{error}</p>}
      <Button type="button" disabled={busy || insufficient || !service} onClick={submit} className="bsm-btn bsm-btn-primary h-12 w-full text-base font-bold">
        {busy ? "Envoi…" : "➤ Envoyer la demande"}
      </Button>
      <p className="text-xs font-semibold text-destructive">⚠️ Amarino tsara fa rehefa lasa dia tsy afaka tapahana intsony.</p>
      <Button type="button" variant="outline" onClick={onClose} className="bsm-btn bsm-btn-ghost w-full">Annuler</Button>
    </>}
  </div>;
}
