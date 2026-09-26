import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/parrainage")({
  head: () => ({
    meta: [
      { title: "Parrainage — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Partagez votre lien de parrainage, invitez vos amis et gagnez des récompenses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Parrainage — BOOST SERVICE MADA" },
      { property: "og:description", content: "Invitez vos amis et gagnez." },
    ],
  }),
  component: ReferralPage,
});

function ReferralPage() {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const link =
    typeof window !== "undefined" && profile
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";

  const { data: filleuls } = useQuery({
    queryKey: ["filleuls", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, created_at")
        .eq("referred_by", user!.id);
      return data ?? [];
    },
  });

  return (
    <AuthGate>
    <Layout>
      <Section title="🎁 Parrainage" subtitle="Invitez vos amis et suivez vos gains.">
        {!user ? (
          <Link to="/auth" className="bsm-btn bsm-btn-primary">
            Se connecter
          </Link>
        ) : (
          <>
            <div className="bsm-card p-5">
              <p className="text-xs text-muted-foreground">Mon code</p>
              <p className="font-display text-2xl font-bold text-gold">{profile?.referral_code}</p>
              <p className="mt-3 break-all rounded-lg bg-secondary p-3 text-xs">{link}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  }}
                  className="bsm-btn bsm-btn-primary !py-2 !text-xs"
                >
                  {copied ? "✅ Copié" : "📋 Copier le lien"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`🚀 Rejoins BOOST SERVICE MADA : ${link}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bsm-btn bsm-btn-gold !py-2 !text-xs"
                >
                  📤 Partager
                </a>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="bsm-card p-4 text-center">
                <p className="font-display text-2xl font-bold text-primary">
                  {filleuls?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">👥 Filleuls</p>
              </div>
              <div className="bsm-card p-4 text-center">
                <p className="font-display text-2xl font-bold text-gold">
                  {formatAr(profile?.referral_earnings ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">💰 Gains parrainage</p>
              </div>
            </div>

            <div className="bsm-card mt-4 p-4">
              <p className="font-semibold">📜 Historique filleuls</p>
              <div className="mt-2 space-y-2">
                {(filleuls ?? []).map((f) => (
                  <div key={f.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                    <p className="font-medium">{f.name || "Utilisateur"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))}
                {!filleuls?.length ? (
                  <p className="text-xs text-muted-foreground">Aucun filleul pour l'instant.</p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </Section>
    </Layout>
    </AuthGate>
  );
}
