import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout, Logo } from "@/components/Layout";
import { useI18n, formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { MembersOnlyCard } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BOOST SERVICE MADA 🇲🇬 — Boost réseaux sociaux Madagascar" },
      {
        name: "description",
        content:
          "Réactions, followers, commentaires, partages et vues pour Facebook, TikTok, Instagram et YouTube. Service rapide 24h/24 à Madagascar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "BOOST SERVICE MADA 🇲🇬" },
      {
        property: "og:description",
        content: "Plateforme Malagasy de boost réseaux sociaux. Rapide, professionnel, 24h/24.",
      },
    ],
  }),
  component: Index,
});

const features = [
  "✅ Réactions",
  "✅ Followers",
  "✅ Commentaires",
  "✅ Partages",
  "✅ Vues",
  "✅ Service rapide",
  "✅ Disponible 24h/24",
];

function Index() {
  const { t } = useI18n();
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["public-stats"],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_stats");
      return (data ?? {}) as { users: number; orders: number; services: number; reviews: number };
    },
  });

  const { data: topServices } = useQuery({
    queryKey: ["top-services"],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <Layout>
      <section className="relative overflow-hidden px-4 pb-10 pt-12 text-center">
        <div className="animate-float mx-auto w-fit">
          <Logo size={110} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-extrabold sm:text-5xl">
          🚀 <span className="bsm-neon-text">BOOST SERVICE</span>{" "}
          <span className="text-gold">MADA</span>
        </h1>
        <p className="mt-3 text-base font-medium text-foreground/90">{t("heroSubtitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("slogan")}</p>

        <div className="mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2">
          {features.map((f) => (
            <span
              key={f}
              className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium"
            >
              {f}
            </span>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Link to="/depot" className="bsm-btn bsm-btn-primary">
                {t("deposit")}
              </Link>
              <Link to="/services" className="bsm-btn bsm-btn-gold">
                {t("orderNow")}
              </Link>
            </>
          ) : (
            <>
              <Link to="/auth" className="bsm-btn bsm-btn-primary">
                ✨ Créer un compte
              </Link>
              <Link to="/auth" className="bsm-btn bsm-btn-gold">
                🔑 Se connecter
              </Link>
            </>
          )}
          <Link to="/contact" className="bsm-btn bsm-btn-ghost">
            {t("contactSupport")}
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: t("users"), value: Math.max(stats?.users ?? 0, 6289), icon: "👥" },
            { label: t("ordersDelivered"), value: Math.max(stats?.orders ?? 0, 1023), icon: "📦" },
            { label: t("servicesAvailable"), value: Math.max(stats?.services ?? 0, 50), icon: "🚀" },
            { label: t("clientReviews"), value: Math.max(stats?.reviews ?? 0, 1089), icon: "⭐" },
          ].map((s) => (
            <div key={s.label} className="bsm-card p-4 text-center">
              <p className="font-display text-2xl font-bold text-primary">
                {s.icon} <Counter value={s.value} />
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          🔥 Sehatra boost atokisan'ny mpampiasa maro eto Madagasikara.
        </p>
        <p className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            ✅ Plateforme active 24h/24
          </span>
        </p>
      </section>


      {user ? (
      <div className="mt-8 overflow-hidden border-y border-border bg-card/50 py-2">
        <div className="animate-marquee flex w-max gap-8 text-xs font-semibold text-muted-foreground">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="flex gap-8">
              <span>🚀 Livraison rapide</span>
              <span>🛡️ Protection Compte 5 000 Ar</span>
              <span>💳 Dépôt minimum 1 000 Ar</span>
              <span>🎁 Parrainage actif</span>
              <span>⭐ Service 24h/24</span>
              <span>🇲🇬 100% Malagasy</span>
            </span>
          ))}
        </div>
      </div>
      ) : null}

      {user ? (
      <section className="mx-auto w-full max-w-5xl px-4 py-10">
        <h2 className="text-xl font-bold">🔥 Services populaires</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(topServices ?? []).map((s) => (
            <Link
              key={s.id}
              to="/services"
              className="bsm-card p-4 transition-transform hover:-translate-y-1"
            >
              <p className="text-xs uppercase tracking-wide text-primary">{s.platform}</p>
              <p className="mt-1 font-semibold">{s.name_fr}</p>
              <p className="mt-2 text-sm text-gold">
                {s.unit} = {formatAr(Number(s.price))}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/services" className="bsm-btn bsm-btn-primary">
            🛒 Voir tous les services
          </Link>
        </div>
      </section>
      ) : (
        <MembersOnlyCard />
      )}

      <section className="mx-auto w-full max-w-5xl px-4 pb-12">
        <div className="bsm-card p-5">
          <h2 className="text-lg font-bold">⚠️ Règles importantes</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>⚠️ Après validation et exécution d'une commande, aucun remboursement n'est possible.</li>
            <li>
              ⚠️ Pour chaque dépôt ou recharge : numéro d'envoi, référence transaction et montant
              envoyé sont obligatoires.
            </li>
            <li>⚠️ Toute fausse information peut entraîner le refus de validation.</li>
          </ul>
        </div>
      </section>
    </Layout>
  );
}

function Counter({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString("fr-FR")}</>;
}
