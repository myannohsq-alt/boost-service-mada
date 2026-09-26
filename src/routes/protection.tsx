import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/protection")({
  head: () => ({
    meta: [
      { title: "Protection Compte 5 000 Ar — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Protégez votre compte Facebook : tutoriel vidéo premium débloqué par un code d'accès unique, 5 000 Ar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Protection Compte — BOOST SERVICE MADA" },
      { property: "og:description", content: "Sécurisez votre compte avec notre guide premium." },
    ],
  }),
  component: ProtectionPage,
});

function ProtectionPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const { data: myCodes, refetch } = useQuery({
    queryKey: ["my-protection", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("protection_codes").select("*");
      return data ?? [];
    },
  });

  const buy = async () => {
    setMsg(null);
    const { data: svc } = await supabase
      .from("services")
      .select("id")
      .eq("platform", "protection")
      .limit(1)
      .maybeSingle();
    if (!svc) return setMsg("❌ Service indisponible.");
    const { error } = await supabase.rpc("place_order", {
      _service_id: svc.id,
      _quantity: 1,
      _link: "protection-compte",
      _promo: "",
    });
    if (error) return setMsg(`❌ ${error.message}`);
    setMsg("✅ Achat enregistré ! L'administrateur va valider et vous fournir votre code d'accès.");
    await refetch();
  };

  const unlock = async () => {
    setMsg(null);
    const { data } = await supabase
      .from("protection_codes")
      .select("id")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (data) {
      setUnlocked(true);
      setMsg("🔓 Code valide — vidéo débloquée !");
    } else {
      setMsg("❌ Code invalide.");
    }
  };

  return (
    <AuthGate>
    <Layout>
      <Section title="🛡️ Protection Compte" subtitle="Tutoriel vidéo premium — 5 000 Ar">
        <div className="bsm-card p-5">
          <p className="font-display text-3xl font-bold text-gold">5 000 Ar</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>🎬 Tutoriel vidéo premium géré par l'administrateur</li>
            <li>🔑 Accès par code unique</li>
            <li>🔒 Sans code, la vidéo reste verrouillée</li>
            <li>✅ Le code est fourni après validation du paiement</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {user ? (
              <button onClick={buy} className="bsm-btn bsm-btn-gold">
                🛡️ Acheter Protection Compte
              </button>
            ) : (
              <Link to="/auth" className="bsm-btn bsm-btn-gold">
                🛡️ Acheter Protection Compte
              </Link>
            )}
          </div>
        </div>

        <div className="bsm-card mt-4 p-5">
          <p className="font-semibold">🔓 Débloquer avec un code</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              value={code}
              maxLength={20}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex : BSM-XXXXXX"
              className="bsm-input flex-1"
            />
            <button onClick={unlock} className="bsm-btn bsm-btn-primary">
              Débloquer
            </button>
          </div>
          {msg ? <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg bg-secondary">
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {unlocked
                ? "🎬 Vidéo premium disponible dans la page Tutoriel."
                : "🔒 Vidéo verrouillée"}
            </div>
          </div>
        </div>

        {myCodes?.length ? (
          <div className="bsm-card mt-4 p-5">
            <p className="font-semibold">🔑 Mes codes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {myCodes.map((c) => (
                <span key={c.id} className="rounded-lg bg-secondary px-3 py-1 font-mono text-sm text-gold">
                  {c.code}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </Section>
    </Layout>
    </AuthGate>
  );
}
