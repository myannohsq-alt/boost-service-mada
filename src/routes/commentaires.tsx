import { createFileRoute } from "@tanstack/react-router";
import { CommentsAiForm } from "@/components/CommentsAiForm";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/commentaires")({
  head: () => ({
    meta: [
      { title: "Commentaires Gasy IA — BOOST SERVICE MADA" },
      { name: "description", content: "Générez des commentaires Facebook en Malagasy avec l'IA et commandez-les en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Commentaires Gasy IA — BOOST SERVICE MADA" },
      { property: "og:description", content: "Commentaires uniques en Gasy, Français ou Mix, 2 000 Ar / 100." },
    ],
  }),
  component: () => (
    <Layout>
      <AuthGate>
        <CommentsPage />
      </AuthGate>
    </Layout>
  ),
});

function CommentsPage() {
  return (
    <div className="mx-auto max-w-md px-3 py-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <CommentsAiForm />
      </div>
    </div>
  );
}
