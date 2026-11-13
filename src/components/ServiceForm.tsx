import { Lock } from "lucide-react";
import { isClosed } from "@/lib/service-groups";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { hasActiveOrderOnLink, ACTIVE_LINK_MSG } from "@/lib/active-link";
import { fulfillNow } from "@/lib/sync-user.functions";
import { REACTIONS, isReactionService, type ReactionKey } from "@/lib/reaction-options";
import { showOrderSent } from "@/components/OrderSentOverlay";
import { privateLinkIssue, cleanPastedLink, linkKindIssue, platformMismatch } from "@/lib/link-check";
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
  const followerVisibility = !needsReaction && !isFacebookGasy && /follower/i.test(group.nameFr)
    && group.options.some((o) => /invisible|tsy hita/i.test(o.service.name_fr));
  // Retain the existing service variant for pricing and provider mapping.
  const invisibleClosed = (hasVisibility || followerVisibility) && !group.options.some((o) => /invisible|tsy hita/i.test(o.service.name_fr) && !isClosed(o.service));
  const visibleClosed = (hasVisibility || followerVisibility) && !group.options.some((o) => /visible|hita/i.test(o.service.name_fr) && !/invisible|tsy hita/i.test(o.service.name_fr) && !isClosed(o.service));
  const matchingOptions = hasVisibility || followerVisibility
    ? group.options.filter((option) => visibility === "invisible"
      ? /invisible|tsy hita/i.test(option.service.name_fr)
      : /visible|hita/i.test(option.service.name_fr) && !/invisible|tsy hita/i.test(option.service.name_fr))
    : isFacebookGasy ? group.options.filter((option) => option.key === gasyType) : group.options;
  const service = matchingOptions.reduce<(typeof group.options)[number] | undefined>(
    (best, current) => !best || current.service.unit < best.service.unit ? current : best,
    undefined,
  )?.service;
  const serviceClosed = !service || isClosed(service);
  const isCustomComments = /^commentaires custom/i.test(service?.name_fr ?? group.nameFr);
  const [commentsText, setCommentsText] = useState("");
  const commentLines = commentsText.split("\n").map((l) => l.trim()).filter(Boolean);
  const quantity = isCustomComments ? commentLines.length : Number(quantityText);
  const invisibleMix = hasVisibility && visibility === "invisible" && reaction === "mix";
  const min = Math.max(100, service?.provider_min ?? 0);
  const belowMin = !Number.isSafeInteger(quantity) || quantity < min;
  const cost = service && Number.isFinite(quantity) && quantity >= 0
    ? Math.ceil(quantity / service.unit * Number(service.price)) : 0;
  const balance = Number(profile?.balance ?? 0);
  const insufficient = cost > balance;

  async function submit() {
    setError(null);
    if (!service || isClosed(service)) return setError("🔒 Service fermé temporairement.");
    let url: URL;
    const cleaned = cleanPastedLink(link);
    if (cleaned !== link) setLink(cleaned);
    try { url = new URL(cleaned); }
    catch { return setError("Entrez un lien valide commençant par https://"); }
    if (url.protocol !== "https:" || !url.hostname.includes("."))
      return setError("Entrez un lien valide commençant par https://");
    const linkIssue = platformMismatch(url, group.platform) ?? privateLinkIssue(url) ?? linkKindIssue(url, service.name_fr ?? "");
    if (linkIssue) return setError(linkIssue);
    if (needsReaction && !reaction) return setError("Choisissez un type de réaction.");
    if (!Number.isSafeInteger(quantity) || quantity < min)
      return setError(`Quantité minimum : ${min}`);
    if (insufficient) { toast.error("Solde insuffisant, veuillez recharger"); return setError("Solde insuffisant, veuillez recharger. Jereo ny commandes ao amin'ny compte-nao"); }
    if (await hasActiveOrderOnLink(url.toString())) { toast.error(ACTIVE_LINK_MSG); return setError(ACTIVE_LINK_MSG); }
    setBusy(true);
    try {
      const { error: err } = isCustomComments
        ? await (supabase.rpc as any)("place_custom_comment_order", { // eslint-disable-line @typescript-eslint/no-explicit-any
            _service_id: service.id, _link: url.toString(), _comments: commentLines.join("\n"),
          })
        : await supabase.rpc("place_order", {
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
      const label = `${isFacebookGasy ? gasyType : name} × ${quantity}`;
      const newBalance = formatAr(balance - cost);
      onOrdered?.();
      onClose();
      window.setTimeout(() => showOrderSent(label, newBalance), 150);
      void fulfillNow({ data: undefined as never }).catch(() => { /* queued for next cycle */ });
      void refresh();
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
      {followerVisibility && <fieldset>
        <legend className="text-xs text-muted-foreground">Type de Followers</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {([["invisible", "🕶️ Followers Invisible", "800 Ar/100"], ["visible", "👁️ Followers Visible", "300 Ar/100"]] as const).map(([v, label, price]) => {
            const locked = v === "invisible" ? invisibleClosed : visibleClosed;
            return <Button key={v} type="button" variant="outline" disabled={locked}
            aria-pressed={visibility === v} onClick={() => { setVisibility(v); setError(null); }}
            className={`relative h-auto min-h-14 min-w-0 flex-col whitespace-normal px-2 py-2 text-center text-xs ${locked ? LOCKED : visibility === v ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {locked ? <LockTag /> : null}
            <span>{label}</span><span className="opacity-80">{locked ? "Fermé temporairement" : price}</span>
          </Button>;
          })}
        </div>
      </fieldset>}
      {hasVisibility && <fieldset>
        <legend className="text-xs text-muted-foreground">Type de Visibilité</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={invisibleClosed} aria-pressed={visibility === "invisible"} onClick={() => { setVisibility("invisible"); if (reaction && !["like", "love", "haha", "mix"].includes(reaction)) setReaction(null); }}
            className={`relative h-auto min-h-14 min-w-0 flex-col whitespace-normal px-2 py-2 text-center text-xs ${invisibleClosed ? LOCKED : visibility === "invisible" ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {invisibleClosed ? <LockTag /> : null}
            <span>Invisible (RAPIDE) • tsy miena 🔥</span>
            {invisibleClosed ? <span className="text-[10px] opacity-80">Fermé temporairement</span> : null}
          </Button>
          <Button type="button" variant="outline" disabled={visibleClosed} aria-pressed={visibility === "visible"} onClick={() => setVisibility("visible")}
            className={`relative ${visibleClosed ? LOCKED : ""} h-auto min-h-14 min-w-0 flex-col whitespace-normal px-2 py-2 text-center text-xs ${visibility === "visible" ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            <span>Réaction visible 🚩 • (rapid)</span>
          </Button>
        </div>
      </fieldset>}
      {needsReaction && <fieldset>
        <legend className="text-xs text-muted-foreground">Type de réaction <span aria-hidden="true">*</span></legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
           {(isFacebookGasy ? REACTIONS.filter(item => item.key !== "photo-love" && item.key !== "mix")
             : hasVisibility && visibility === "invisible" ? REACTIONS.filter(item => ["like", "love", "haha", "mix"].includes(item.key))
             : REACTIONS).map(item => <Button key={item.key} type="button" variant="outline"
            aria-pressed={reaction === item.key}
            onClick={() => setReaction(item.key)}
            className={`h-10 min-w-0 px-2 text-xs ${reaction === item.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {item.key === "mix" && hasVisibility && visibility === "invisible" ? "🎭 Mix 👍❤️" : item.label}
          </Button>)}
        </div>
      </fieldset>}
      {isCustomComments ? <div>
        <label htmlFor="service-comments" className="text-xs text-muted-foreground">Commentaires (1 par ligne, min. {min})</label>
        <textarea id="service-comments" rows={6} value={commentsText} onChange={e => setCommentsText(e.target.value)} className="bsm-input mt-1 h-auto py-2" placeholder={"Super !\nTrop bien 🔥"} />
        <p className={`mt-1 text-xs ${belowMin ? "text-destructive" : "text-muted-foreground"}`}>{quantity} commentaire(s)</p>
      </div> : <div>
        <label htmlFor="service-quantity" className="text-xs text-muted-foreground">Quantité (min. {min})</label>
        <input id="service-quantity" type="number" min={min} step="1" value={quantityText} onChange={e => setQuantityText(e.target.value)} className="bsm-input mt-1" />
        <p className={`mt-1 text-xs ${belowMin ? "text-destructive" : "text-muted-foreground"}`}>
          Minimum : {min} {invisibleMix ? "(👍 + ❤️ zaraina roa)" : ""}{belowMin ? " — tsy ampy ny quantité" : ""}
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUICK.map(value => <Button key={value} type="button" variant="outline" disabled={value < min}
            aria-pressed={quantity === value} onClick={() => setQuantityText(String(value))}
            className={`h-9 min-w-0 px-1 text-xs ${quantity === value ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary text-foreground"}`}>
            {value.toLocaleString("fr-FR")}
          </Button>)}
        </div>
      </div>}
      <div className="rounded-md border border-border bg-secondary p-3 text-sm">
        <div className="flex items-center justify-between gap-2"><span>Mon solde</span><strong className="text-primary">{formatAr(balance)}</strong></div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2"><span>Total à payer</span><strong className="text-lg text-primary">{formatAr(cost)}</strong></div>
      </div>
      {insufficient && <p className="text-xs text-destructive">Solde insuffisant, veuillez recharger. <Link to="/depot" className="underline">Recharger</Link></p>}
      {error && <p role="alert" className="rounded-md bg-secondary p-2 text-xs text-destructive">{error}</p>}
      <div className="space-y-2">
        <Button type="button" disabled={busy || insufficient || serviceClosed || belowMin} onClick={submit} className="bsm-btn bsm-btn-primary h-12 w-full text-base font-bold">
          {busy ? "Envoi…" : `Commander — ${formatAr(cost)}`}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="bsm-btn bsm-btn-ghost w-full">Annuler</Button>
      </div>
    </>}
  </div>;
}

const LOCKED = "cursor-not-allowed border-dashed border-border bg-muted/40 text-muted-foreground opacity-70 disabled:opacity-70";

function LockTag() {
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm" aria-label="Fermé">
      <Lock className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}
