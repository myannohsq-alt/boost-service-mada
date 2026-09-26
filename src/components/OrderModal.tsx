import { useEffect } from "react";
import type { ServiceGroup } from "@/lib/service-groups";
import { ServiceForm } from "@/components/ServiceForm";
import { CommentsAiForm } from "@/components/CommentsAiForm";
import { CommentReactionForm } from "@/components/CommentReactionForm";
import { Button } from "@/components/ui/button";
export { ServiceBadge, BADGES } from "@/components/ServiceBadge";

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
          {group.platform === "facebook" && /réactions sur commentaires/i.test(group.nameFr) ? (
            <CommentReactionForm group={group} onClose={onClose} onOrdered={onOrdered} />
          ) : group.platform === "facebook" && /^commentaires$/i.test(group.nameFr) ? (
            <CommentsAiForm onClose={onClose} />
          ) : (
            <ServiceForm group={group} onClose={onClose} onOrdered={onOrdered} />
          )}
        </div>
      </div>
    </div>
  );
}
