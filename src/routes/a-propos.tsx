import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — BOOST SERVICE MADA 🇲🇬" },
      {
        name: "description",
        content:
          "BOOST SERVICE MADA est une plateforme malagasy de boost réseaux sociaux : rapide, sécurisée et disponible 24h/24, réservée à ses membres.",
      },
      { property: "og:title", content: "À propos — BOOST SERVICE MADA" },
      {
        property: "og:description",
        content: "Qui sommes-nous : plateforme premium malagasy de boost réseaux sociaux.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <Layout>
      <Section
        title="ℹ️ À propos de BOOST SERVICE MADA"
        subtitle="Plateforme 100% Malagasy de boost réseaux sociaux."
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            BOOST SERVICE MADA accompagne les créateurs, entrepreneurs et pages malagasy qui veulent
            développer rapidement leur visibilité sur Facebook, TikTok, Instagram et YouTube :
            réactions, followers, commentaires, partages et vues.
          </p>
          <p>
            Paiement simple en Ariary via Mobile Money, livraison rapide, suivi des commandes en
            temps réel et support disponible 24h/24 sur Messenger et WhatsApp.
          </p>
          <p>
            L'accès aux services, aux tarifs et au portefeuille est réservé aux membres inscrits, afin
            de garantir un espace sécurisé et un suivi personnalisé de chaque commande.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { t: "🚀 Rapide", d: "Livraison démarrée peu après validation." },
            { t: "🛡️ Sécurisé", d: "Compte protégé et données privées." },
            { t: "🇲🇬 Local", d: "Prix en Ariary, support en Malagasy." },
          ].map((c) => (
            <div key={c.t} className="bsm-card p-4">
              <p className="font-semibold">{c.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/auth" className="bsm-btn bsm-btn-primary">
            ✨ Créer un compte
          </Link>
          <Link to="/contact" className="bsm-btn bsm-btn-ghost">
            📞 Contact
          </Link>
        </div>
      </Section>
    </Layout>
  );
}
