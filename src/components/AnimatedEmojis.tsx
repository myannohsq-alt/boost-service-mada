import { useEffect } from "react";

// Wraps emoji characters in text nodes with animated spans site-wide.
// Only touches text inside elements marked as not React-reconciled-sensitive: we wrap in place
// and skip inputs/textareas/scripts. Runs after hydration, re-scans on DOM changes.
const RE = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
const CLS: Record<string, string> = { "👍": "emo-bounce", "❤️": "emo-beat", "❤": "emo-beat", "😂": "emo-wiggle", "🔥": "emo-flame", "🚀": "emo-launch", "✨": "emo-sparkle", "🎉": "emo-wiggle" };
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "OPTION", "TITLE", "NOSCRIPT"]);

function wrap(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest(".emo,[contenteditable]")) return NodeFilter.FILTER_REJECT;
      RE.lastIndex = 0;
      return RE.test(n.nodeValue || "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((t) => {
    const p = t.parentElement!;
    // Only animate when the emoji is the sole content of its element, so React text nodes stay intact.
    const txt = (t.nodeValue || "").trim();
    RE.lastIndex = 0;
    const m = txt.match(RE);
    if (m && m.length === 1 && txt === m[0] && p.childNodes.length === 1) {
      p.classList.add("emo", CLS[m[0]] || "emo-float");
    }
  });
}

export function AnimatedEmojis() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => wrap(document.body)); };
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
