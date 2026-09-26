export const BADGES: Record<string, { label: string; className: string }> = {
  top: { label: "🔥 Top Populaire", className: "bg-destructive/20 text-destructive-foreground border-destructive/50" },
  ultra: { label: "⚡ Ultra", className: "bg-primary/15 text-primary border-primary/50" },
  reco: { label: "⭐ Recommandé", className: "bg-gold/15 text-gold border-gold/50" },
  new: { label: "🆕 Nouveau", className: "bg-secondary text-foreground border-border" },
};

export function ServiceBadge({ badge }: { badge?: string | null | undefined }) {
  const b = badge ? BADGES[badge] : undefined;
  if (!b) return null;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${b.className}`}>{b.label}</span>;
}
