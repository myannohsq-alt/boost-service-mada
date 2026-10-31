/**
 * Rejects link shapes that the provider cannot reach (private / login-only content).
 * A browser cannot read Facebook privacy settings, so this catches known private formats only.
 */
const MSG = "Lien privé ou non public. Ataovy « Public » aloha ny publication/kaonty, avy eo adikao indray ny rohy.";

export function privateLinkIssue(url: URL): string | null {
  const host = url.hostname.replace(/^www\.|^m\.|^web\.|^mbasic\./, "");
  const path = url.pathname.toLowerCase();
  if (/messenger\.com$/.test(host) || path.startsWith("/messages")) return MSG;
  if (host.endsWith("facebook.com") || host === "fb.com" || host === "fb.watch") {
    if (/^\/(login|checkpoint|settings|notifications|friends|marketplace|saved|bookmarks)/.test(path)) return MSG;
    if (url.searchParams.has("next") && path.includes("login")) return MSG;
  }
  if (host.endsWith("instagram.com") && /^\/(accounts|direct)/.test(path)) return MSG;
  if (host.endsWith("tiktok.com") && /^\/(login|messages|inbox)/.test(path)) return MSG;
  return null;
}
