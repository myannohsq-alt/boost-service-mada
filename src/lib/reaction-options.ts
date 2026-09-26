/** Shared labels and provider mapping for Facebook reaction products. */
export const REACTIONS = [
  { key: "like", label: "👍 J'aime" },
  { key: "love", label: "❤️ J'adore" },
  { key: "care", label: "🥰" },
  { key: "haha", label: "😂" },
  { key: "photo-love", label: "Pdp/pdc❤️" },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]["key"];
export const isReactionService = (platform: string, name: string) =>
  platform.toLowerCase() === "facebook" && /réaction|reaction/i.test(name);

/** The photo/cover Love choice uses the provider's Facebook post/photo Love product. */
export function reactionProviderId(key: string, name: string): string | null {
  const comment = /commentaire|comment/i.test(name);
  const ids: Record<ReactionKey, string> = comment
    ? { like: "12669", love: "12670", care: "12671", haha: "12673", "photo-love": "12670" }
    : { like: "16823", love: "16824", care: "16825", haha: "16827", "photo-love": "16824" };
  return Object.hasOwn(ids, key) ? ids[key as ReactionKey] : null;
}
