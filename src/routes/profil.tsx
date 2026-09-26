import { createFileRoute } from "@tanstack/react-router";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { ProfileHeader, InviteCard, Wheel, WheelResults, SaturdayDraw } from "@/components/ProfileGame";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil, roue et classement — BOOST SERVICE MADA" },
      { name: "description", content: "Consultez votre solde, partagez votre invitation et découvrez la roue et le classement BoostMada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Mon profil, roue et classement — BOOST SERVICE MADA" },
      { property: "og:description", content: "Solde, invitation, roue de la fortune et tirage du samedi." },
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
            <InviteCard />
            <div>
              <Wheel />
              <div className="mt-2"><WheelResults /></div>
            </div>
            <SaturdayDraw />
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}