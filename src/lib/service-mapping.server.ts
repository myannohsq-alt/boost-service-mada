// Automatic mapping between local BOOST SERVICE MADA services and SMMGen services (server-only).

type Rule = {
  kind: string;
  // every group must match at least one keyword (searched in name + category)
  include: string[][];
  exclude: string[];
};

const RULES: Record<string, Rule> = {
  fb_like: { kind: "fb_like", include: [["facebook"], ["like", "reaction"]], exclude: ["story", "live", "page like", "comment", "share", "follower", "view", "group", "subscriber"] },
  fb_follow: { kind: "fb_follow", include: [["facebook"], ["follower"]], exclude: ["group", "story", "live"] },
  fb_comment: { kind: "fb_comment", include: [["facebook"], ["comment"]], exclude: ["like", "reaction", "share"] },
  fb_page: { kind: "fb_page", include: [["facebook"], ["page like", "page follower"]], exclude: [] },
  fb_view: { kind: "fb_view", include: [["facebook"], ["view", "play"]], exclude: ["live", "story"] },
  fb_share: { kind: "fb_share", include: [["facebook"], ["share"]], exclude: [] },
  fb_group: { kind: "fb_group", include: [["facebook"], ["group"]], exclude: [] },
  ig_follow: { kind: "ig_follow", include: [["instagram"], ["follower"]], exclude: ["tv", "live"] },
  ig_like: { kind: "ig_like", include: [["instagram"], ["like"]], exclude: ["comment", "tv", "live", "story", "view"] },
  ig_view: { kind: "ig_view", include: [["instagram"], ["view", "play"]], exclude: ["story", "live", "profile"] },
  tt_like: { kind: "tt_like", include: [["tiktok"], ["like"]], exclude: ["live", "comment", "follower", "view"] },
  tt_view: { kind: "tt_view", include: [["tiktok"], ["view", "play"]], exclude: ["live", "story", "profile"] },
  tt_follow: { kind: "tt_follow", include: [["tiktok"], ["follower"]], exclude: ["live"] },
  tt_comment: { kind: "tt_comment", include: [["tiktok"], ["comment"]], exclude: ["like", "view"] },
  tt_save: { kind: "tt_save", include: [["tiktok"], ["save", "favorite"]], exclude: [] },
  yt_like: { kind: "yt_like", include: [["youtube"], ["like"]], exclude: ["live", "comment", "dislike", "view"] },
  yt_view: { kind: "yt_view", include: [["youtube"], ["view"]], exclude: ["live", "short", "premiere"] },
};

export function detectKind(service: { platform: string; category: string; name_fr: string }): string | null {
  const p = service.platform.toLowerCase();
  const t = `${service.category} ${service.name_fr}`.toLowerCase();
  const has = (...k: string[]) => k.some((x) => t.includes(x));

  if (p === "facebook") {
    if (has("groupe")) return "fb_group";
    if (has("partage")) return "fb_share";
    if (has("vue")) return "fb_view";
    if (has("commentaire")) return "fb_comment";
    if (has("page", "recommandation")) return "fb_page";
    if (has("follower", "abonné")) return "fb_follow";
    if (has("réaction", "reaction", "like")) return "fb_like";
    return null;
  }
  if (p === "instagram") {
    if (has("follower", "abonné")) return "ig_follow";
    if (has("vue", "view")) return "ig_view";
    if (has("like", "réaction")) return "ig_like";
    return null;
  }
  if (p === "tiktok") {
    if (has("save", "enregistr")) return "tt_save";
    if (has("commentaire")) return "tt_comment";
    if (has("follower", "abonné")) return "tt_follow";
    if (has("vue", "view")) return "tt_view";
    if (has("like")) return "tt_like";
    return null;
  }
  if (p === "youtube") {
    if (has("vue", "view")) return "yt_view";
    if (has("like")) return "yt_like";
    return null;
  }
  return null; // e.g. "protection": local-only service
}

type ProviderRow = {
  provider_service_id: string;
  name: string;
  category: string;
  rate_usd: number;
  min_qty: number;
  max_qty: number;
};

const FAST_RE = /fast|instant|rapide/i;

// Quality score from the provider name (names use unicode bold: normalize first).
function qualityScore(name: string): number {
  const n = name.normalize("NFKC").toLowerCase();
  let s = 0;
  if (/\breal\b|réel/.test(n)) s += 1;
  if (/no\s*drop|non[- ]?drop|stable|lifetime|permanent/.test(n)) s += 2;
  if (/refill|guarantee/.test(n) && !/no\s*refill/.test(n)) s += 2;
  if (/\bhq\b|high\s*quality|premium/.test(n)) s += 1;
  return s;
}

// Highest delivery speed advertised in the provider name, e.g. "100k-300k/day" -> 300000.
function speedPerDay(name: string): number {
  let best = 0;
  for (const m of name.matchAll(/(\d+(?:\.\d+)?)\s*([km]?)\s*\/\s*days?/gi)) {
    const mult = m[2]?.toLowerCase() === "k" ? 1_000 : m[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
    best = Math.max(best, Number(m[1]) * mult);
  }
  return best;
}

// Picks the best compatible provider: Real + No Drop + Refill + HQ first,
// then "Fast/Instant", then highest speed, then price. Candidates costing more
// than 3x the cheapest compatible option are ignored to avoid runaway costs.
export function pickProvider(rule: Rule, unit: number, rows: ProviderRow[]): ProviderRow | null {
  const candidates = rows.filter((r) => {
    const t = `${r.name} ${r.category}`.normalize("NFKC").toLowerCase();
    if (rule.exclude.some((k) => t.includes(k))) return false;
    if (!rule.include.every((group) => group.some((k) => t.includes(k)))) return false;
    if (r.min_qty > unit) return false;
    if (r.max_qty < unit) return false;
    if (!(r.rate_usd > 0)) return false;
    return true;
  });
  if (!candidates.length) return null;
  const cheapest = Math.min(...candidates.map((c) => c.rate_usd));
  const pool = candidates.filter((c) => c.rate_usd <= cheapest * 3);
  pool.sort((a, b) => {
    const qa = qualityScore(a.name);
    const qb = qualityScore(b.name);
    if (qa !== qb) return qb - qa;
    const fa = FAST_RE.test(a.name) ? 1 : 0;
    const fb = FAST_RE.test(b.name) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const sa = speedPerDay(a.name);
    const sb = speedPerDay(b.name);
    if (sa !== sb) return sb - sa;
    return a.rate_usd - b.rate_usd;
  });
  return pool[0] ?? null;
}

// Group services are linked manually (fastest provider chosen by the admin), never auto-mapped.
const MANUAL_KINDS = new Set(["fb_group"]);

export type MapReport = {
  mapped: number;
  unmapped: { name: string; reason: string }[];
  details: { name: string; provider_service_id: string; provider_name: string; rate_usd: number }[];
};

export async function autoMapServices(): Promise<MapReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: locals } = await supabaseAdmin
    .from("services")
    .select("id, platform, category, name_fr, unit, provider_service_id");
  const rows: ProviderRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin
      .from("provider_services")
      .select("provider_service_id, name, category, rate_usd, min_qty, max_qty")
      .range(from, from + 999);
    if (!data?.length) break;
    rows.push(...(data as ProviderRow[]));
    if (data.length < 1000) break;
  }

  const report: MapReport = { mapped: 0, unmapped: [], details: [] };
  if (!rows.length) {
    report.unmapped.push({ name: "—", reason: "Catalogue fournisseur vide : importez d'abord les services." });
    return report;
  }

  for (const local of locals ?? []) {
    const kind = detectKind(local);
    if (!kind) {
      await supabaseAdmin
        .from("services")
        .update({ provider_name: "BOOST SERVICE MADA (manuel)" })
        .eq("id", local.id);
      report.unmapped.push({ name: local.name_fr, reason: "Service local (traitement manuel)" });
      continue;
    }
    if (MANUAL_KINDS.has(kind)) {
      report.unmapped.push({ name: local.name_fr, reason: "Liaison manuelle (service Groupe)" });
      continue;
    }
    const rule = RULES[kind]!;
    const best = pickProvider(rule, local.unit, rows);
    if (!best) {
      report.unmapped.push({ name: local.name_fr, reason: `Aucun service SMMGen compatible (${kind})` });
      continue;
    }
    await supabaseAdmin
      .from("services")
      .update({
        provider_service_id: best.provider_service_id,
        provider_name: "SMMGen",
        provider_min: best.min_qty,
        provider_max: best.max_qty,
        provider_rate_usd: best.rate_usd,
      })
      .eq("id", local.id);
    report.mapped += 1;
    report.details.push({
      name: local.name_fr,
      provider_service_id: best.provider_service_id,
      provider_name: best.name,
      rate_usd: best.rate_usd,
    });
  }
  return report;
}
