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
            <Link
              to="/depot"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-gold py-4 font-display text-lg font-black tracking-wide text-primary-foreground shadow-lg transition active:scale-95"
            >
              💸 RECHARGE
            </Link>
            <InviteCard />
            <LotteryDraw />
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}
