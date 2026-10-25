import { createFileRoute } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => publicPageHead("/faq", "Questions fréquentes — Recharge et commandes BoostMada", "Retrouvez les réponses sur les recharges, les commandes et le support BOOST SERVICE MADA avant de choisir votre service de boost."),
  component: FaqPage,
});

const faqs = [
  { q: "❓ Dépôt minimum ?", a: "✅ 1 000 Ar" },
  {
    q: "❓ Comment faire une recharge ?",
    a: "✅ Envoyer le numéro d'envoi, la référence et le montant.",
  },
  { q: "❓ Les services sont-ils rapides ?", a: "✅ Oui." },
  { q: "❓ Puis-je récupérer mon argent après une commande ?", a: "✅ Non." },
  {
    q: "❓ Où contacter le support ?",
    a: "✅ Messenger BOOST & SERVICE ou WhatsApp +261 37 51 410 25.",
  },
];

function FaqPage() {
  return (
    <Layout>
      <Section title="❓ FAQ" subtitle="Questions fréquentes.">
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="bsm-card p-4">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="bsm-card mt-6 p-5">
          <h2 className="font-semibold">⚠️ Règles</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>⚠️ Après validation et exécution d'une commande, aucun remboursement n'est possible.</li>
            <li>
              ⚠️ Pour chaque dépôt ou recharge : numéro d'envoi, référence transaction, montant
              envoyé.
            </li>
            <li>⚠️ Toute fausse information peut entraîner le refus de validation.</li>
          </ul>
        </div>
      </Section>
    </Layout>
  );
}
