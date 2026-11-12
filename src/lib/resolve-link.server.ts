// Expands short share links (facebook.com/share/..., fb.me, vm/vt.tiktok.com) to the real
// post URL so provider bots can reach the content directly (avoids start_count 0 "Completed").
const SHORT_RE = /^https?:\/\/(www\.|m\.|web\.)?(facebook\.com\/share\/|fb\.me\/)|^https?:\/\/(vm|vt)\.tiktok\.com\//i;
const DROP = /^(rdid|share_url|substory_index|mibextid|_r|_t|is_from_webapp|sender_device|utm_.*)$/;

export async function resolveShortLink(link: string): Promise<string> {
  if (!SHORT_RE.test(link)) return link;
  let current = link;
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(current, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(6000) });
      const loc = res.headers.get("location");
      if (!loc || res.status < 300 || res.status >= 400) break;
      const next = new URL(loc, current);
      if (/\/login|checkpoint/i.test(next.pathname)) break;
      current = next.toString();
      if (!SHORT_RE.test(current)) break;
    } catch { break; }
  }
  try {
    const u = new URL(current);
    for (const k of [...u.searchParams.keys()]) if (DROP.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch { return link; }
}
