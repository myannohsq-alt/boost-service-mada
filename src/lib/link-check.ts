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

/** Extracts the first URL from pasted share text (e.g. TikTok Lite) and strips tracking params. */
export function cleanPastedLink(raw: string): string {
  const m = raw.match(/https?:\/\/[^\s"'<>]+/i);
  let s = (m ? m[0] : raw.trim()).replace(/[.,;)!]+$/, "");
  try {
    const u = new URL(s);
    if (/tiktok\.com$/.test(u.hostname.replace(/^www\.|^vm\.|^vt\.|^m\./, "")) || u.hostname.endsWith("tiktok.com")) {
      u.search = "";
      u.hash = "";
    }
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|_r$|_t$|is_from_webapp|sender_device|mibextid|rdid|share_url|igsh)/.test(k)) u.searchParams.delete(k);
    s = u.toString();
  } catch { /* leave as is */ }
  return s;
}

const POST_RE = /\/(posts|videos?|reel|reels|photo|photos|permalink|story\.php|watch|p)\b|story_fbid=|fbid=|\/share\/(p|v|r)\//i;
const PROFILE_FB_RE = /^\/(profile\.php|people\/)/i;

/** Blocks obviously wrong link kinds: post links for followers, profile links for reactions/comments. */
export function linkKindIssue(url: URL, serviceName: string): string | null {
  const name = serviceName.toLowerCase();
  const full = url.pathname + url.search;
  const isPost = POST_RE.test(full);
  const host = url.hostname;
  if (/follower|abonn|membre|member/.test(name) && isPost)
    return "Followers : apetraho ny rohy PROFIL na PAGE, fa tsy rohy publication/vidéo.";
  if (/réaction|reaction|comment|like|j'aime|partage|share|vue|view/.test(name) && !/follower|abonn/.test(name)) {
    if (host.includes("facebook.com") && PROFILE_FB_RE.test(url.pathname) && !isPost)
      return "Apetraho ny rohy PUBLICATION mivantana, fa tsy rohy profil.";
  }
  return null;
}
