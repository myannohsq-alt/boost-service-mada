import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";
import { publicPageHead } from "@/lib/seo";
import { useAuth } from "@/lib/useAuth";
import { OPERATORS } from "@/lib/payment-operators";


export const Route = createFileRoute("/contact")({
  head: () => publicPageHead("/contact", "Contact et support — BOOST SERVICE MADA", "Contactez BOOST SERVICE MADA sur Messenger BOOST & SERVICE ou WhatsApp au +261 37 51 410 25 pour vos questions sur les services et commandes."),
  component: ContactPage,
});

function ContactPage() {
  const { user } = useAuth();

  return (
    <Layout>
      <Section title="📞 Contact" subtitle="Support disponible 24h/24.">
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href="https://m.me/BOOST-SERVICE"
            target="_blank"
            rel="noreferrer"
            className="bsm-card p-5 transition-transform hover:-translate-y-1"
          >
            <p className="text-2xl">💬</p>
            <p className="mt-2 font-semibold">Messenger</p>
            <p className="text-sm text-muted-foreground">BOOST &amp; SERVICE</p>
          </a>
          <a
            href="https://wa.me/261375141025"
            target="_blank"
            rel="noreferrer"
            className="bsm-card p-5 transition-transform hover:-translate-y-1"
          >
            <p className="text-2xl">📱</p>
            <p className="mt-2 font-semibold">WhatsApp / SMS</p>
            <p className="text-sm text-muted-foreground">+261 37 51 410 25</p>
          </a>
        </div>

        {user ? (
          <div className="bsm-card mt-4 p-5 text-sm">
            <p className="font-semibold">📱 Numéros de paiement officiels</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {OPERATORS.map((o) => (
                <li key={o.id}>
                  {o.emoji} {o.label} — <strong className="text-foreground">{o.phone}</strong> —{" "}
                  {o.owner}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bsm-card mt-4 p-5 text-center text-sm">
            <p className="font-semibold">🔒 Numéros de paiement masqués</p>
            <p className="mt-2 text-muted-foreground">
              Veuillez vous connecter pour accéder aux services et aux numéros de paiement.
            </p>
            <Link to="/auth" className="bsm-btn bsm-btn-primary mt-4">
              🔑 Se connecter
            </Link>
          </div>
        )}

      </Section>
    </Layout>
  );
}
