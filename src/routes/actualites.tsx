import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout, Section } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/actualites")({
  head: () => ({
    meta: [
      { title: "Actualités — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Nouveautés, informations importantes et mises à jour de la plateforme.",
      },
      { property: "og:title", content: "Actualités — BOOST SERVICE MADA" },
      { property: "og:description", content: "Toutes les annonces de la plateforme." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { data: news } = useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <Layout>
      <Section title="📰 Actualités" subtitle="Nouveautés et informations importantes.">
        <div className="space-y-3">
          {(news ?? []).map((n) => (
            <article key={n.id} className="bsm-card p-5">
              <h2 className="font-semibold">{n.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{n.content}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString("fr-FR")}
              </p>
            </article>
          ))}
          {!news?.length ? (
            <p className="text-sm text-muted-foreground">Aucune actualité.</p>
          ) : null}
        </div>
      </Section>
    </Layout>
  );
}
