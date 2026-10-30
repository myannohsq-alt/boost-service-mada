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
  { key: "love", label: "Love ❤️" },
  { key: "haha", label: "Haha 😂" },
  { key: "wow", label: "Wow 😮" },
  { key: "sad", label: "Sad 😢" },
  { key: "angry", label: "Angry 😡" },
] as const;

const QUICK = [100, 500, 1000];
const PRICE_PER_100 = 1500;
const CIBLES = [{ key: "pub", label: "Pub" }, { key: "pdp", label: "PDP" }, { key: "pdc", label: "PDC" }] as const;

export function CommentReactionForm({ group, onClose, onOrdered }: {
  group: ServiceGroup;
  onClose: () => void;
  onOrdered?: (() => void) | undefined;
}) {
  const { user, profile, refresh } = useAuth();
  const [link, setLink] = useState("");
  const [personName, setPersonName] = useState("");
  const [reaction, setReaction] = useState<string | null>(null);
  const [tier, setTier] = useState<"gasy" | "vazah">("gasy");
  const [cible, setCible] = useState<string>("pub");
  const [quantityText, setQuantityText] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = group.options[0]?.service;
  const quantity = Number(quantityText);
  const min = 100;
  const cost = Number.isSafeInteger(quantity) && quantity > 0 ? Math.ceil(quantity / 100 * (TIERS.find(t => t.key === tier)?.price ?? 2000)) : 0;
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
        _note: `reaction:${reaction};target:${name};cible:${cible};tier:${tier}`,
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

  return <div className="space-y-4">
    <div>
      <ServiceBadge badge={group.badge} />
      <h2 id="service-form-title" className="mt-1 font-display text-lg font-bold text-foreground">Réaction sur Commentaire 💬</h2>
    </div>
    {!user ? <div className="space-y-3 text-sm">
      <p>Vous devez être connecté pour commander.</p>
      <Button asChild className="bsm-btn bsm-btn-primary w-full"><Link to="/auth">Se connecter</Link></Button>
    </div> : <>
      <div className="grid grid-cols-2 gap-2">
        {TIERS.map(t => <Button key={t.key} type="button" variant="outline" aria-pressed={tier === t.key} onClick={() => setTier(t.key)}
          className={`h-10 min-w-0 px-1 text-[11px] font-bold ${tier === t.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>{t.label}</Button>)}
      </div>
      <div>
        <label htmlFor="cr-cible" className="text-xs text-muted-foreground">🎯 Cible</label>
        <select id="cr-cible" value={cible} onChange={e => setCible(e.target.value)} className="bsm-input mt-1">
          {CIBLES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
      <fieldset>
        <legend className="text-xs text-muted-foreground">😍 Type de réaction <span aria-hidden="true">*</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REACTION_CHOICES.map(item => <Button key={item.key} type="button" variant="outline"
            aria-pressed={reaction === item.key}
            onClick={() => setReaction(item.key)}
            className={`h-10 min-w-0 px-2 text-xs ${reaction === item.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {item.label}
          </Button>)}
        </div>
      </fieldset>
      <div>
        <label htmlFor="cr-link" className="text-xs text-muted-foreground">🔗 Lien de la Publication</label>
        <input id="cr-link" type="url" value={link} maxLength={500} inputMode="url" onChange={e => setLink(e.target.value)} placeholder="https://facebook.com/.../posts/..." className="bsm-input mt-1" />
        <p className="mt-1 text-[11px] text-muted-foreground">Apetraho lien publication misy ny com's an'i Rakoto, dia soraty anarany, dia izahay boost-na réaction @ com's-ny</p>
      </div>
      <div>
        <label htmlFor="cr-quantity" className="text-xs text-muted-foreground">🔢 Quantité (min. {min})</label>
        <input id="cr-quantity" type="number" min={min} step="1" value={quantityText} onChange={e => setQuantityText(e.target.value)} placeholder="100, 500, 1000..." className="bsm-input mt-1" />
        <div className="mt-2 grid grid-cols-3 gap-2">
          {QUICK.map(value => <Button key={value} type="button" variant="outline"
            aria-pressed={quantity === value} onClick={() => setQuantityText(String(value))}
            className={`h-9 min-w-0 px-1 text-xs ${quantity === value ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {value.toLocaleString("fr-FR")}
          </Button>)}
        </div>
      </div>
      <div>
        <label htmlFor="cr-name" className="text-xs text-muted-foreground">👤 Nom auteur commentaire *</label>
        <input id="cr-name" type="text" value={personName} maxLength={100} onChange={e => setPersonName(e.target.value)} placeholder="Ex: Rakoto" className="bsm-input mt-1" />
      </div>
      <div className="rounded-md border border-border bg-secondary p-3 text-sm">
        <div className="flex items-center justify-between gap-2"><span>Mon solde</span><strong className="text-primary">{formatAr(balance)}</strong></div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2"><span>Total à payer</span><strong className="text-lg text-primary">{formatAr(cost)}</strong></div>
      </div>
      {insufficient && <p className="text-xs text-destructive">Solde insuffisant. <Link to="/recharge" className="underline">Recharger</Link></p>}
      {error && <p role="alert" className="rounded-md bg-secondary p-2 text-xs text-destructive">{error}</p>}
      <div className="space-y-2">
        <Button type="button" disabled={busy || insufficient || !service} onClick={submit} className="bsm-btn bsm-btn-primary h-12 w-full text-base font-bold">
          {busy ? "Envoi…" : `Commander — ${formatAr(cost)}`}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="bsm-btn bsm-btn-ghost w-full">Annuler</Button>
      </div>
    </>}
  </div>;
}
