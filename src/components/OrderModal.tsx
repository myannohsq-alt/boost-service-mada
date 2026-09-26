import { useEffect } from "react";
import type { ServiceGroup } from "@/lib/service-groups";
import { ServiceForm } from "@/components/ServiceForm";
import { Button } from "@/components/ui/button";

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
  group,
  onClose,
  onOrdered,
}: {
  group: ServiceGroup;
  onClose: () => void;
  onOrdered?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-form-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-in slide-in-from-bottom-4 fade-in overflow-hidden rounded-t-lg border border-primary/60 bg-card shadow-[0_0_40px_-6px_var(--color-primary)] sm:rounded-lg"
      >
        <div className="max-h-[88vh] overflow-y-auto p-5">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fermer">✕</Button>
          </div>
          <ServiceForm group={group} onClose={onClose} onOrdered={onOrdered} />
        </div>
      </div>
    </div>
  );
}
