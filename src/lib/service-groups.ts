import type { ServiceCard } from "@/components/OrderModal";

export type ServiceOption = {
  key: string;
  label: string;
  service: ServiceCard;
};

export type ServiceGroup = {
  key: string;
  platform: string;
  category: string;
  nameFr: string;
  nameMg: string;
  note: string | null;
  badge?: string | null | undefined;
  deliveryTime: string;
  options: ServiceOption[];
  /** cheapest unit price (Ar per single unit) across the group */
  unitPrice: number;
};

export const FACEBOOK_GASY_KEY = "facebook|facebook gasy";

const PACK_RE = /\s*\((\d+)\s*k\)\s*/i;

function splitName(raw: string): { base: string; option: string } {
  const clean = raw.replace(PACK_RE, " ").replace(/\s+/g, " ").trim();
  const idx = clean.search(/[—–-]\s/);
  if (idx < 0) return { base: clean, option: "" };
  return { base: clean.slice(0, idx).trim(), option: clean.slice(idx + 1).trim() };
}

const OPTION_ICONS: { test: RegExp; icon: string }[] = [
  { test: /invisible|tsy hita/i, icon: "🕶️" },
  { test: /visible|hita/i, icon: "👁️" },
  { test: /rapide|speed|fast|haingana/i, icon: "⚡" },
  { test: /lent|slow|drip/i, icon: "🐢" },
  { test: /premium|hq|qualit/i, icon: "💎" },
];

function optionLabel(raw: string): string {
  const label = raw.replace(/^boost\s+/i, "").trim();
  const found = OPTION_ICONS.find((o) => o.test.test(label));
  return `${found ? `${found.icon} ` : ""}${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

/**
 * Turns the flat service list into one orderable product per platform + name,
 * with the naming variants ("Boost Visible", "Boost Invisible", packs 1K…)
 * exposed as option buttons instead of separate cards.
 */
export function buildServiceGroups(services: ServiceCard[]): ServiceGroup[] {
  const map = new Map<string, ServiceGroup>();

  for (const s of services) {
    const fr = splitName(s.name_fr);
    const mg = splitName(s.name_mg || s.name_fr);
    const facebookGasy = s.platform.toLowerCase() === "facebook" && /^(réactions|followers) gasy$/i.test(fr.base);
    const key = facebookGasy ? FACEBOOK_GASY_KEY : `${s.platform}|${fr.base.toLowerCase()}`;
    const unitPrice = Number(s.price) / Math.max(1, s.unit);

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        platform: s.platform,
        category: facebookGasy ? "Facebook Gasy" : s.category,
        nameFr: facebookGasy ? "Facebook Gasy 🇲🇬" : fr.base,
        nameMg: facebookGasy ? "Facebook Gasy 🇲🇬" : mg.base,
        note: s.note,
        badge: s.badge ?? null,
        deliveryTime: s.delivery_time || "0-6 h",
        options: [],
        unitPrice,
      };
      map.set(key, group);
    }

    if (/indispo/i.test(s.badge ?? "")) group.badge = s.badge;
    else if (!group.badge && s.badge) group.badge = s.badge;
    if (!group.note && s.note) group.note = s.note;
    if (unitPrice < group.unitPrice) group.unitPrice = unitPrice;

    const label = facebookGasy
      ? (/^réactions/i.test(fr.base) ? "Réaction Gasy" : "Followers Gasy")
      : fr.option ? optionLabel(fr.option) : "🚀 Standard";
    const existing = group.options.find((o) => o.key === label);
    if (!existing) {
      group.options.push({ key: label, label, service: s });
    } else if (s.unit < existing.service.unit) {
      // Keep the smallest pack so a 100-unit order stays available.
      existing.service = s;
    }
  }

  return [...map.values()];
}
