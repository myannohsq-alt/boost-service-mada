/** Shared labels and provider mapping for Facebook reaction products. */
export const REACTIONS = [
  { key: "like", label: "👍 J'aime" },
  { key: "love", label: "❤️ J'adore" },
  { key: "care", label: "🥰 Solidaire" },
  { key: "haha", label: "😂 Haha" },
  { key: "wow", label: "😮 Wouah" },
  { key: "sad", label: "😢 Triste" },
  { key: "angry", label: "😡 En colère" },
  { key: "photo-love", label: "Pdp/pdc❤️" },
  { key: "mix", label: "🎭 Mix 👍❤️🥰" },
] as const;

/** Kept for compatibility; all reactions are now in REACTIONS. */
export const COMMENT_ONLY_REACTIONS = [] as const;

export type ReactionKey =
  | (typeof REACTIONS)[number]["key"]
  | (typeof COMMENT_ONLY_REACTIONS)[number]["key"];
export const isReactionService = (platform: string, name: string) =>
  platform.toLowerCase() === "facebook" && /réaction|reaction/i.test(name);

/** The photo/cover Love choice uses the provider's Facebook post/photo Love product. */
export function reactionProviderId(key: string, name: string, invisible = false): string | null {
  const comment = /commentaire|comment/i.test(name);
  // Invisible = SMMGen "Hidden Data" products: count rises, reactor names stay hidden.
  const ids: Record<ReactionKey, string | null> = comment
    ? // SMMGen Ultrafast comment reactions (~10 000/day).
      { like: "18690", love: "18691", care: "18692", haha: "18693", wow: "18694", sad: "18695", angry: "18696", "photo-love": "18691", mix: "12724" }
    : invisible
      ? // Hidden data, instant, 10k/day, NO REFILL (~$0.24/1k).
        { like: "18375", love: "18376", care: "18376", haha: "18379", "photo-love": "18376", wow: "18378", sad: "18380", angry: "18381", mix: "19819" }
      : // Global Data Cheapest, instant, 50k/day, NO REFILL (~$0.074/1k).
        { like: "17347", love: "17348", care: "17349", haha: "17351", "photo-love": "17348", wow: "17350", sad: "17352", angry: "17353", mix: "19819" };
  return Object.hasOwn(ids, key) ? ids[key as ReactionKey] : null;
}
