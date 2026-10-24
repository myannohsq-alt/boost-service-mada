import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fulfillNow } from "@/lib/sync-user.functions";
import { REACTIONS, isReactionService, type ReactionKey } from "@/lib/reaction-options";
import { FACEBOOK_GASY_KEY, type ServiceGroup } from "@/lib/service-groups";
import { ServiceBadge } from "@/components/ServiceBadge";

const QUICK = [100, 500, 1000, 5000];

export function ServiceForm({ group, onClose, onOrdered }: {
  group: ServiceGroup;
  onClose: () => void;
  onOrdered?: (() => void) | undefined;
}) {
  const { lang } = useI18n();
  const { user, profile, refresh } = useAuth();
  const [link, setLink] = useState("");
  const [reaction, setReaction] = useState<ReactionKey | null>(null);
  const [visibility, setVisibility] = useState<"visible" | "invisible">("visible");
  const [gasyType, setGasyType] = useState<"Réaction Gasy" | "Followers Gasy">("Réaction Gasy");
  const [quantityText, setQuantityText] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = lang === "mg" ? group.nameMg : group.nameFr;
  const isFacebookGasy = group.key === FACEBOOK_GASY_KEY;
  const needsReaction = isFacebookGasy ? gasyType === "Réaction Gasy" : isReactionService(group.platform, group.nameFr);
  const hasVisibility = needsReaction && /vazah/i.test(group.nameFr);
  // Retain the existing service variant for pricing and provider mapping.
  const matchingOptions = hasVisibility
    ? group.options.filter((option) => visibility === "invisible"
      ? /invisible|tsy hita/i.test(option.service.name_fr)
      : /visible|hita/i.test(option.service.name_fr) && !/invisible|tsy hita/i.test(option.service.name_fr))
    : isFacebookGasy ? group.options.filter((option) => option.key === gasyType) : group.options;
  const service = matchingOptions.reduce<(typeof group.options)[number] | undefined>(
    (best, current) => !best || current.service.unit < best.service.unit ? current : best,
    undefined,
  )?.service;
  const quantity = Number(quantityText);
  const min = 100;
  const cost = service && Number.isFinite(quantity) && quantity >= 0
    ? Math.ceil(quantity / service.unit * Number(service.price)) : 0;
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
    if (needsReaction && !reaction) return setError("Choisissez un type de réaction.");
    if (!Number.isSafeInteger(quantity) || quantity < min)
      return setError(`Quantité minimum : ${min}`);
    if (insufficient) { toast.error("Solde insuffisant, veuillez recharger"); return setError("Solde insuffisant, veuillez recharger. Jereo ny commandes ao amin'ny compte-nao"); }
    setBusy(true);
    try {
      const { error: err } = await supabase.rpc("place_order", {
        _service_id: service.id,
        _quantity: quantity,
        _link: url.toString(),
        _promo: "",
        _note: needsReaction ? `reaction:${reaction}${hasVisibility && visibility === "invisible" ? ";visibility:invisible" : ""}` : "",
      });
      if (err) {
        setError(err.message);
        toast.error("Commande refusée", { description: err.message });
        return;
      }
       toast.success(`Commande réussie ! Nouveau solde : ${formatAr(balance - cost)}`, { description: `${isFacebookGasy ? gasyType : name} × ${quantity} — statut : En cours` });
      try { await fulfillNow({ data: undefined as never }); }
      catch { /* The order remains queued for the next cycle. */ }
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
      <h2 id="service-form-title" className="mt-1 font-display text-lg font-bold text-foreground">{name}</h2>
    </div>
    {!user ? <div className="space-y-3 text-sm">
      <p>Vous devez être connecté pour commander.</p>
      <Button asChild className="bsm-btn bsm-btn-primary w-full"><Link to="/auth">Se connecter</Link></Button>
    </div> : <>
      <div>
        <label htmlFor="service-link" className="text-xs text-muted-foreground">Lien de la publication / du profil</label>
        <input id="service-link" type="url" value={link} maxLength={500} inputMode="url" onChange={e => setLink(e.target.value)} placeholder="https://..." className="bsm-input mt-1" />
      </div>
      {isFacebookGasy && <fieldset>
        <legend className="text-xs text-muted-foreground">Choix du type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["Réaction Gasy", "Followers Gasy"] as const).map(type => <Button key={type} type="button" variant="outline"
            aria-pressed={gasyType === type} onClick={() => { setGasyType(type); setError(null); }}
            className={`h-12 min-w-0 whitespace-normal px-2 text-center text-xs ${gasyType === type ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {type}
          </Button>)}
        </div>
      </fieldset>}
      {hasVisibility && <fieldset>
        <legend className="text-xs text-muted-foreground">Type de Visibilité</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" aria-pressed={visibility === "invisible"} onClick={() => setVisibility("invisible")}
            className={`h-auto min-h-14 min-w-0 flex-col whitespace-normal px-2 py-2 text-center text-xs ${visibility === "invisible" ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            <span>Invisible (RAPIDE) • tsy miena 🔥</span>
          </Button>
          <Button type="button" variant="outline" aria-pressed={visibility === "visible"} onClick={() => setVisibility("visible")}
            className={`h-auto min-h-14 min-w-0 flex-col whitespace-normal px-2 py-2 text-center text-xs ${visibility === "visible" ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            <span>Réaction visible 🚩 • (rapid)</span>
          </Button>
        </div>
      </fieldset>}
      {needsReaction && <fieldset>
        <legend className="text-xs text-muted-foreground">Type de réaction <span aria-hidden="true">*</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
           {(isFacebookGasy ? REACTIONS.filter(item => item.key !== "photo-love" && item.key !== "mix") : REACTIONS).map(item => <Button key={item.key} type="button" variant="outline"
            aria-pressed={reaction === item.key}
            onClick={() => setReaction(item.key)}
            className={`h-10 min-w-0 px-2 text-xs ${reaction === item.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {item.label}
          </Button>)}
        </div>
      </fieldset>}
      <div>
        <label htmlFor="service-quantity" className="text-xs text-muted-foreground">Quantité (min. {min})</label>
        <input id="service-quantity" type="number" min={min} step="1" value={quantityText} onChange={e => setQuantityText(e.target.value)} className="bsm-input mt-1" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUICK.map(value => <Button key={value} type="button" variant="outline" disabled={value < min}
            aria-pressed={quantity === value} onClick={() => setQuantityText(String(value))}
            className={`h-9 min-w-0 px-1 text-xs ${quantity === value ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {value.toLocaleString("fr-FR")}
          </Button>)}
        </div>
      </div>
      <div className="rounded-md border border-border bg-secondary p-3 text-sm">
        <div className="flex items-center justify-between gap-2"><span>Mon solde</span><strong className="text-primary">{formatAr(balance)}</strong></div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2"><span>Total à payer</span><strong className="text-lg text-primary">{formatAr(cost)}</strong></div>
      </div>
      {insufficient && <p className="text-xs text-destructive">Solde insuffisant, veuillez recharger. <Link to="/depot" className="underline">Recharger</Link></p>}
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
