import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { OrderModal, ServiceBadge, type ServiceCard } from "@/components/OrderModal";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Tarifs — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Tarifs Facebook, TikTok, Instagram et YouTube : réactions, followers, vues, commentaires et partages à petit prix en Ariary.",
      },
      { property: "og:title", content: "Services & Tarifs — BOOST SERVICE MADA" },
      { property: "og:description", content: "Tous nos services de boost réseaux sociaux en Ariary." },
    ],
  }),
  component: ServicesPage,
});

const platforms = [
  { id: "facebook", label: "📘 Facebook" },
  { id: "tiktok", label: "🎵 TikTok" },
  { id: "instagram", label: "📸 Instagram" },
  { id: "youtube", label: "▶️ YouTube" },
  { id: "protection", label: "🛡️ Protection" },
];

function ServicesPage() {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("facebook");
  const [selected, setSelected] = useState<ServiceCard | null>(null);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as unknown as ServiceCard[];
    },
  });

  const list = useMemo(
    () => (services ?? []).filter((s) => s.platform === platform),
    [services, platform],
  );

  return (
    <AuthGate>
      <Layout>
        <Section
          title="🛒 Services & Tarifs"
          subtitle="Prix en Ariary. Le solde est débité automatiquement à la commande."
        >
          <div className="flex flex-wrap items-center gap-2">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`bsm-btn !py-1.5 !text-xs transition-transform active:scale-95 ${
                  platform === p.id ? "bsm-btn-primary" : "bsm-btn-ghost"
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto rounded-full bg-secondary px-3 py-1.5 text-xs">
              💰 Solde : <span className="font-bold text-primary">{formatAr(profile?.balance ?? 0)}</span>
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="bsm-card group p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_0_28px_-8px_var(--color-primary)] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] uppercase tracking-wide text-primary">{s.category}</p>
                  <ServiceBadge badge={s.badge} />
                </div>
                <p className="mt-1 font-semibold">{lang === "mg" ? s.name_mg : s.name_fr}</p>
                <p className="mt-1 text-sm text-gold">
                  {s.unit} = {formatAr(Number(s.price))}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ⏱️ {s.delivery_time || "0-6 h"}
                </p>
                {s.note ? <p className="mt-1 text-xs text-muted-foreground">{s.note}</p> : null}
                <span className="bsm-btn bsm-btn-primary mt-3 block w-full !py-2 text-center !text-xs">
                  🚀 Commander
                </span>
              </button>
            ))}
            {!list.length ? (
              <p className="text-sm text-muted-foreground">Aucun service pour cette plateforme.</p>
            ) : null}
          </div>
        </Section>

        {selected ? (
          <OrderModal
            service={selected}
            onClose={() => setSelected(null)}
            onOrdered={() => {
              void qc.invalidateQueries({ queryKey: ["my-orders"] });
              void qc.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        ) : null}
      </Layout>
    </AuthGate>
  );
}
