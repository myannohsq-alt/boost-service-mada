import { createFileRoute } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & support 24h/24 — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Contactez le support BOOST SERVICE MADA sur Messenger BOOST & SERVICE ou WhatsApp +261 37 51 410 25.",
      },
      { property: "og:title", content: "Contact — BOOST SERVICE MADA" },
      { property: "og:description", content: "Support disponible 24h/24." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
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

        <div className="bsm-card mt-4 p-5 text-sm">
          <p className="font-semibold">📱 Numéros de paiement</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>0375141025 — ROLINE</li>
            <li>0330296908 — MARODOLINX</li>
            <li>0386100374 — THÉODORE</li>
          </ul>
        </div>
      </Section>
    </Layout>
  );
}
