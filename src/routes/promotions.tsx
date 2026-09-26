import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout, Section } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/promotions")({
  head: () => ({
    meta: [
      { title: "Promotions & codes promo — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Offres spéciales, réductions temporaires et codes promo comme MADA10 et PROMO20.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Promotions — BOOST SERVICE MADA" },
      { property: "og:description", content: "Profitez de nos réductions du moment." },
    ],
  }),
  component: PromoPage,
});

function PromoPage() {
  const { data } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const [promos, codes] = await Promise.all([
        supabase.from("promotions").select("*").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("promo_codes").select("*").eq("active", true),
      ]);
      return { promos: promos.data ?? [], codes: codes.data ?? [] };
    },
  });

  return (
    <Layout>
      <Section title="🎉 Promotions" subtitle="Offres spéciales et réductions temporaires.">
        <div className="space-y-3">
          {(data?.promos ?? []).map((p) => (
            <div key={p.id} className="bsm-card p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{p.title}</h2>
                {p.discount ? (
                  <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-gold-foreground">
                    -{p.discount}%
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              {p.ends_at ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Fin : {new Date(p.ends_at).toLocaleDateString("fr-FR")}
                </p>
              ) : null}
            </div>
          ))}
          {!data?.promos?.length ? (
            <p className="text-sm text-muted-foreground">Aucune promotion en cours.</p>
          ) : null}
        </div>

        <h2 className="mt-8 text-lg font-bold">🎟️ Codes promo actifs</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(data?.codes ?? []).map((c) => (
            <div key={c.id} className="bsm-card px-4 py-3 text-center">
              <p className="font-display font-bold text-gold">{c.code}</p>
              <p className="text-[11px] text-muted-foreground">-{c.discount_percent}%</p>
            </div>
          ))}
        </div>
      </Section>
    </Layout>
  );
}
