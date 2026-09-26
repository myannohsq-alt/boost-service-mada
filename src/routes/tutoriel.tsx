import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tutoriel")({
  head: () => ({
    meta: [
      { title: "Tutoriels vidéo — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Apprenez à créer un compte, faire un dépôt, commander et suivre vos commandes sur BOOST SERVICE MADA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Tutoriels — BOOST SERVICE MADA" },
      { property: "og:description", content: "Guides pas à pas en Malagasy et Français." },
    ],
  }),
  component: TutoPage,
});

function TutoPage() {
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: tutos } = useQuery({
    queryKey: ["tutorials"],
    queryFn: async () => {
      const { data } = await supabase.from("tutorials").select("*").order("created_at");
      return data ?? [];
    },
  });

  const unlock = async () => {
    setMsg(null);
    const { data } = await supabase
      .from("protection_codes")
      .select("id")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (data) {
      setUnlocked(true);
      setMsg("🔓 Code valide, vidéos premium débloquées !");
    } else {
      setMsg("❌ Code invalide.");
    }
  };

  return (
    <AuthGate>
    <Layout>
      <Section title="📖 Tutoriel" subtitle="Guides simples pour bien utiliser la plateforme.">
        <div className="bsm-card p-5">
          <p className="font-semibold">🔓 Débloquer les tutoriels premium</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={code}
              maxLength={20}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code d'accès"
              className="bsm-input flex-1"
            />
            <button onClick={unlock} className="bsm-btn bsm-btn-primary">
              Valider
            </button>
          </div>
          {msg ? <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}
        </div>

        <div className="mt-5 space-y-3">
          {(tutos ?? []).map((t) => {
            const locked = t.is_premium && !unlocked;
            return (
              <div key={t.id} className="bsm-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{t.title}</h2>
                  <span className="text-xs">{t.is_premium ? (locked ? "🔒 Premium" : "🔓 Premium") : "🎬 Gratuit"}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
                {locked ? (
                  <div className="mt-3 rounded-lg bg-secondary p-6 text-center text-sm text-muted-foreground">
                    🔒 Vidéo verrouillée — entrez un code d'accès valide.
                  </div>
                ) : t.video_url ? (
                  <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg">
                    <iframe
                      src={t.video_url}
                      title={t.title}
                      allowFullScreen
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-secondary p-4 text-xs text-muted-foreground">
                    Vidéo bientôt disponible.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </Layout>
    </AuthGate>
  );
}
