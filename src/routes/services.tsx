import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { OrderModal, ServiceBadge, type ServiceCard } from "@/components/OrderModal";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildServiceGroups, type ServiceGroup } from "@/lib/service-groups";

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
  const [selected, setSelected] = useState<ServiceGroup | null>(null);

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
    () => buildServiceGroups((services ?? []).filter((s) => s.platform === platform)),
    [services, platform],
  );

  const times = useDynamicTimes(list);

  return (
    <AuthGate>
      <Layout>
        <section className="mx-auto w-full max-w-5xl px-3 py-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">Services</h1>
              <p className="text-[11px] text-muted-foreground">Boostez vos réseaux sociaux — 100% Gasy 🇲🇬</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px]">
              Solde <span className="font-bold bsm-neon-text">{formatAr(profile?.balance ?? 0)}</span>
            </span>
          </div>

          <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  platform === p.id
                    ? "bg-[image:var(--gradient-neon)] text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {list.map((g, i) => (
              <ServiceTile
                key={g.key}
                group={g}
                id={idFor(services ?? [], g)}
                name={lang === "mg" ? g.nameMg : g.nameFr}
                time={times[g.key] ?? formatMinutes(baseMinutes(g.deliveryTime))}
                chosen={chosenPct(g.key, i)}
                onClick={() => setSelected(g)}
              />
            ))}
            {!list.length ? (
              <p className="col-span-2 text-sm text-muted-foreground">Aucun service pour cette plateforme.</p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <OrderModal
            group={selected}
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
