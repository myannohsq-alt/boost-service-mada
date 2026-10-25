export const SITE_URL = "https://boostmada.app";
export const SHARE_IMAGE = `${SITE_URL}/social/boostmada-share.jpg`;

export function publicPageHead(path: string, title: string, description: string, shareImage = false) {
  const url = `${SITE_URL}${path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: shareImage ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      ...(shareImage ? [
        { property: "og:image", content: SHARE_IMAGE },
        { property: "og:image:secure_url", content: SHARE_IMAGE },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "BOOST SERVICE MADA — Boostez vos réseaux sociaux, 100% Gasy" },
        { name: "twitter:image", content: SHARE_IMAGE },
        { name: "twitter:image:alt", content: "BOOST SERVICE MADA — Boostez vos réseaux sociaux, 100% Gasy" },
      ] : []),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}