import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    ...publicPageHead("/", "BoostMada — Boost réseaux sociaux à Madagascar, 100% Gasy", "Réactions, abonnés, vues et commentaires pour Facebook, TikTok, Instagram et YouTube. Créez votre compte ; paiements en Ariary via MVola, Orange Money ou Airtel.", true),
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "BOOST SERVICE MADA",
        alternateName: "BoostMada",
        url: "https://boostmada.app/",
        inLanguage: ["fr", "mg"],
      }),
    }],
  }),
  component: AuthPage,
});
