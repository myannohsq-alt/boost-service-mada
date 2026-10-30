import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { ProfileHeader, InviteCard } from "@/components/ProfileGame";
import { LotteryDraw } from "@/components/LotteryDraw";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil et tirage solde — BOOST SERVICE MADA" },
      { name: "description", content: "Consultez votre solde, rechargez, invitez vos amis et participez au tirage de 19h30." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Mon profil et tirage solde — BOOST SERVICE MADA" },
      { property: "og:description", content: "Solde, recharge, invitation et tirage quotidien de 19h30." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  return (
    <AuthGate>
      <Layout hideAnnouncement>
        <Section title="Mon profil">
          <div className="mx-auto max-w-xl space-y-4">
            <ProfileHeader />
            <div className="flex justify-center">
              <Link
                to="/depot"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-gold px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-md ring-1 ring-primary/40 transition hover:brightness-110 active:scale-95"
              >
                <span>💸</span> Recharge <span aria-hidden>→</span>
              </Link>
            </div>
            <InviteCard />
            <LotteryDraw />
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}
