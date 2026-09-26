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

type Block = { video: string; steps: string[] };

// Les 3 blocs principaux ont une vraie vidéo + les étapes en Malagasy.
const BLOCKS: Array<{ match: string[]; video: string; steps: string[] }> = [
  {
    match: ["depot", "dépôt", "deposit", "recharge"],
    video: "/videos/depot.mp4",
    steps: [
      "Tsindrio RECHARGE ao amin'ny menu.",
      "Safidio ny montant tianao averina.",
      "Safidio MVola (034 65 466 00) dia ampidiro ny laharana sy ny référence.",
      "Tsindrio VALIDER dia andraso ny fankatoavana.",
    ],
  },
  {
    match: ["suivi", "mes commandes", "statut"],
    video: "/videos/suivi.mp4",
    steps: [
      "Midira ao amin'ny Mes commandes.",
      "Jereo ny statut : En cours 🟡 na Terminé 🟢.",
    ],
  },
  {
    match: ["commander"],
    video: "/videos/commande.mp4",
    steps: [
      "Safidio ny service tianao.",
      "Ampidiro ny rohy (lien) sy ny isa (quantité).",
      "Tsindrio COMMANDER — ny hafatra ao amin'ny groupe dia 1 Ar / hafatra.",
    ],
  },
  {
    match: ["créer un compte", "creer un compte", "inscrire"],
    video: "/videos/compte.mp4",
    steps: [
      "Tsindrio HISORATRA ANARANA (Inscription).",
      "Fenoy ny anarana, ny mailaka ary ny tenimiafina.",
      "Tsindrio Hiditra dia lasa Services avy hatrany.",
    ],
  },
];

function blockFor(title: string): Block | null {
  const t = title.toLowerCase();
  const found = BLOCKS.find((b) => b.match.some((m) => t.includes(m)));
  return found ? { video: found.video, steps: found.steps } : null;
}

function VideoPlayer({ src }: { src: string }) {
  return (
    <video
      controls
      playsInline
      preload="metadata"
      title="Tutoriel BOOST SERVICE MADA"
      className="mt-3 block"
      style={{
        width: "100%",
        borderRadius: "12px",
        background: "#0a1930",
        aspectRatio: "16 / 9",
        objectFit: "contain",
      }}
    >
      <source src={src} type="video/mp4" />
      Tsy afaka mamaky ity horonantsary ity ny navigateur-nao.
    </video>
  );
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        📝 Ny dingona
      </p>
      <ol className="mt-3 space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-primary-foreground shadow-[0_0_14px_-4px_var(--color-primary)]"
              style={{ backgroundImage: "var(--gradient-neon)" }}
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-foreground/90">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

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

  const ordered = (tutos ?? []).slice().sort((a, b) => {
    const av = blockFor(a.title) ? 0 : 1;
    const bv = blockFor(b.title) ? 0 : 1;
    return av - bv;
  });

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
            {ordered.map((t) => {
              const locked = t.is_premium && !unlocked;
              const block = blockFor(t.title);
              return (
                <div key={t.id} className="bsm-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{t.title}</h2>
                    <span className="shrink-0 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                      {t.is_premium ? (locked ? "🔒 Premium" : "🔓 Premium") : "Gratuit 🎬"}
                    </span>
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
                  ) : block ? (
                    <>
                      <VideoPlayer src={block.video} />
                      <Steps steps={block.steps} />
                    </>
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
