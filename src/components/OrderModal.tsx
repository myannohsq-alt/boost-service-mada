import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type ServiceCard = {
  id: string;
  platform: string;
  category: string;
  name_fr: string;
  name_mg: string;
  unit: number;
  price: number;
  note: string | null;
  badge?: string | null | undefined;
  delivery_time?: string | null | undefined;
};

export const BADGES: Record<string, { label: string; className: string }> = {
  top: { label: "🔥 Top Populaire", className: "bg-destructive/20 text-destructive-foreground border-destructive/50" },
  ultra: { label: "⚡ Ultra", className: "bg-primary/15 text-primary border-primary/50" },
  reco: { label: "⭐ Recommandé", className: "bg-gold/15 text-gold border-gold/50" },
  new: { label: "🆕 Nouveau", className: "bg-secondary text-foreground border-border" },
};

export function ServiceBadge({ badge }: { badge?: string | null | undefined }) {
  const b = badge ? BADGES[badge] : undefined;
  if (!b) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${b.className}`}
    >
      {b.label}
    </span>
  );
}

export function OrderModal({
  service,
  onClose,
  onOrdered,
}: {
  service: ServiceCard;
  onClose: () => void;
  onOrdered?: () => void;
}) {
  const { lang } = useI18n();
  const { user, profile, refresh } = useAuth();
  const [quantity, setQuantity] = useState(service.unit);
  const [link, setLink] = useState("");
  const [promo, setPromo] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = lang === "mg" ? service.name_mg : service.name_fr;
  const cost = useMemo(
    () => Math.ceil((quantity / service.unit) * Number(service.price)),
    [quantity, service],
  );
  const balance = Number(profile?.balance ?? 0);
  const insufficient = cost > balance;

  const submit = async () => {
    setError(null);
    if (!link.trim()) {
      setError("⚠️ Le lien est obligatoire.");
      return;
    }
    if (quantity < service.unit) {
      setError(`⚠️ Quantité minimum : ${service.unit}`);
      return;
    }
    if (insufficient) {
      setError("⚠️ Solde insuffisant. Effectuez un dépôt ou une recharge avant de commander.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.rpc("place_order", {
      _service_id: service.id,
      _quantity: quantity,
      _link: link.trim(),
      _promo: promo.trim(),
      _note: notes.trim().slice(0, 500),
    });
    setBusy(false);
    if (err) {
      setError(`❌ ${err.message}`);
      toast.error("Commande refusée", { description: err.message });
      return;
    }
    toast.success("✅ Commande créée !", {
      description: `${name} × ${quantity} — statut : En attente`,
    });
    await refresh();
    onOrdered?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-3 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-in slide-in-from-bottom-4 fade-in overflow-hidden rounded-3xl border border-primary/60 bg-card shadow-[0_0_40px_-6px_oklch(0.86_0.26_152_/_0.45)]"
      >
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <ServiceBadge badge={service.badge} />
              <h2 className="mt-1 font-display text-lg font-bold">{name}</h2>
              <p className="text-[11px] uppercase tracking-wide text-primary">
                {service.platform} • {service.category}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-full bg-secondary px-2.5 py-1 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-muted-foreground">🆔 ID service</p>
              <p className="mt-0.5 truncate font-mono">{service.id.slice(0, 8)}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-muted-foreground">💵 Prix</p>
              <p className="mt-0.5 font-semibold text-gold">
                {service.unit} = {formatAr(Number(service.price))}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-muted-foreground">⏱️ Livraison estimée</p>
              <p className="mt-0.5 font-semibold">{service.delivery_time || "0-6 h"}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-3">
              <p className="text-muted-foreground">💰 Mon solde</p>
              <p className="mt-0.5 font-semibold text-primary">{formatAr(balance)}</p>
            </div>
          </div>

          {!user ? (
            <div className="mt-4 text-sm">
              <p>Vous devez être connecté pour commander.</p>
              <Link to="/auth" className="bsm-btn bsm-btn-primary mt-3 w-full">
                Se connecter
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  🔗 Lien (Facebook / TikTok / Instagram / YouTube)
                </label>
                <input
                  value={link}
                  maxLength={500}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://..."
                  className="bsm-input mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">🔢 Quantité</label>
                  <input
                    type="number"
                    min={service.unit}
                    step={service.unit}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="bsm-input mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">🎟️ Code promo</label>
                  <input
                    value={promo}
                    maxLength={20}
                    onChange={(e) => setPromo(e.target.value.toUpperCase())}
                    className="bsm-input mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">📝 Notes (optionnel)</label>
                <textarea
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instructions particulières…"
                  className="bsm-input mt-1 min-h-16"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-secondary p-3 text-sm">
                <span>Total à payer</span>
                <span className="font-display text-lg font-bold text-gold">{formatAr(cost)}</span>
              </div>

              {insufficient ? (
                <div className="rounded-xl border border-destructive/50 bg-secondary p-3 text-xs">
                  <p className="font-semibold text-gold">
                    ⚠️ Solde insuffisant ({formatAr(balance)}). Rechargez avant de commander.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Link to="/depot" className="bsm-btn bsm-btn-primary !py-2 !text-xs">
                      💳 Faire un dépôt
                    </Link>
                    <Link to="/recharge" className="bsm-btn bsm-btn-gold !py-2 !text-xs">
                      ⚡ Recharger
                    </Link>
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="rounded-lg bg-secondary p-3 text-xs text-gold">{error}</p>
              ) : null}

              <div className="flex gap-2 pt-1">
                <button
                  disabled={busy || insufficient}
                  onClick={submit}
                  className="bsm-btn bsm-btn-primary flex-1 transition-transform active:scale-95 disabled:opacity-50"
                >
                  {busy ? "⏳ Envoi…" : "🚀 Commander maintenant"}
                </button>
                <button onClick={onClose} className="bsm-btn bsm-btn-ghost">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
