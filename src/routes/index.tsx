import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BoostMada - Boost Facebook TikTok Instagram 100% Gasy | boostmada.app" },
      { name: "description", content: "Boostez vos réseaux sociaux 100% Gasy. Likes, Followers, Vues, Commentaires IA Gasy. Paiement MVola Orange Money Airtel. Livraison rapide Madagascar." },
      { property: "og:title", content: "BoostMada - Boost Facebook TikTok Instagram 100% Gasy" },
      { property: "og:description", content: "Boostez vos réseaux sociaux 100% Gasy. Likes, Followers, Vues, Commentaires IA Gasy. Paiement MVola Orange Money Airtel. Livraison rapide Madagascar." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://boostmada.app/" },
      { property: "og:site_name", content: "BoostMada" },
      { property: "og:locale", content: "fr_MG" },
      { property: "og:image", content: "https://boostmada.app/icon-512.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://boostmada.app/icon-512.png" },
    ],
  }),
  component: AuthPage,
});
