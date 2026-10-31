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
      { like: "12724", love: "12724", care: "12724", haha: "12724", wow: "12724", sad: "12724", angry: "12724", "photo-love": "12724", mix: "12724" }
    : invisible
      ? // Hidden data, instant, 10k/day, NO REFILL (~$0.24/1k).
        { like: "18607", love: "18608", care: "18608", haha: "18611", "photo-love": "18608", wow: "18610", sad: "18612", angry: "18613", mix: "18608" }
      : // Global Data Cheapest, instant, 50k/day, NO REFILL (~$0.074/1k).
        { like: "17347", love: "17348", care: "17349", haha: "17351", "photo-love": "17348", wow: "17350", sad: "17352", angry: "17353", mix: "17347" };
  return Object.hasOwn(ids, key) ? ids[key as ReactionKey] : null;
}
