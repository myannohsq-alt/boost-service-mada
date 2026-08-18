import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { NUMBERS } from "./recharge";

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Faire un dépôt — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Dépôt Mobile Money à partir de 1 000 Ar. 1$ = 6 000 Ar, 2$ = 12 000 Ar. Numéros Roline, Marodolinx et Théodore.",
      },
      { property: "og:title", content: "Dépôt — BOOST SERVICE MADA" },
      { property: "og:description", content: "Déposez à partir de 1 000 Ar via Mobile Money." },
    ],
  }),
  component: DepotPage,
});

function DepotPage() {
  return (
    <AuthGate>
    <Layout>
      <Section title="💳 Dépôt" subtitle="Dépôt minimum : 1 000 Ar.">
        <div className="grid gap-3 sm:grid-cols-3">
          {NUMBERS.map((n) => (
            <div key={n.phone} className="bsm-card p-4 text-center">
              <p className="font-display text-lg font-bold text-primary">{n.phone}</p>
              <p className="text-xs text-muted-foreground">{n.owner}</p>
            </div>
          ))}
        </div>

        <div className="bsm-card mt-5 p-5">
          <h2 className="font-semibold">💵 Dépôt direct site</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="font-display text-xl font-bold text-gold">1$ = 6 000 Ar</p>
            </div>
            <div className="rounded-lg bg-secondary p-4 text-center">
              <p className="font-display text-xl font-bold text-gold">2$ = 12 000 Ar</p>
            </div>
          </div>
        </div>

        <div className="bsm-card mt-5 p-5 text-sm">
          <h2 className="font-semibold">📖 Étapes</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Envoyez l'argent à l'un des numéros ci-dessus.</li>
            <li>Notez la référence de la transaction.</li>
            <li>Remplissez le formulaire de recharge.</li>
            <li>L'administrateur valide et votre solde est crédité.</li>
          </ol>
          <Link to="/recharge" className="bsm-btn bsm-btn-primary mt-4">
            ✅ Valider ma recharge
          </Link>
        </div>
      </Section>
    </Layout>
    </AuthGate>
  );
}
