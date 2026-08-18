import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/avis")({
  head: () => ({
    meta: [
      { title: "Avis clients — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Lisez les avis des clients de BOOST SERVICE MADA et partagez votre expérience.",
      },
      { property: "og:title", content: "Avis clients — BOOST SERVICE MADA" },
      { property: "og:description", content: "La parole à nos clients malgaches." },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data: reviews } = useQuery({
    queryKey: ["reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const send = async () => {
    setMsg(null);
    const { error } = await supabase
      .from("reviews")
      .insert({ rating, comment: comment.trim().slice(0, 500) });
    if (error) return setMsg(`❌ ${error.message}`);
    setComment("");
    setMsg("✅ Merci pour votre avis !");
    await qc.invalidateQueries({ queryKey: ["reviews"] });
  };

  return (
    <Layout>
      <Section title="⭐ Avis clients" subtitle="Votre retour nous aide à nous améliorer.">
        <div className="bsm-card p-5">
          {user ? (
            <>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} className="text-2xl">
                    {n <= rating ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              <textarea
                className="bsm-input mt-3 min-h-24"
                maxLength={500}
                placeholder="Votre commentaire…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button onClick={send} className="bsm-btn bsm-btn-primary mt-3">
                Envoyer mon avis
              </button>
            </>
          ) : (
            <Link to="/auth" className="bsm-btn bsm-btn-primary">
              Se connecter pour laisser un avis
            </Link>
          )}
          {msg ? <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}
        </div>

        <div className="mt-4 space-y-3">
          {(reviews ?? []).map((r) => (
            <div key={r.id} className="bsm-card p-4">
              <p className="text-gold">{"⭐".repeat(r.rating)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
          {!reviews?.length ? (
            <p className="text-sm text-muted-foreground">Aucun avis pour l'instant.</p>
          ) : null}
        </div>
      </Section>
    </Layout>
  );
}
