import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";

export const Route = createFileRoute("/suivi-commentaires")({
  head: () => ({
    meta: [
      { title: "Suivi des commentaires — BOOST SERVICE MADA" },
      { name: "description", content: "Suivez vos commandes de commentaires IA : liste, lien et statut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Suivi des commentaires — BOOST SERVICE MADA" },
      { property: "og:description", content: "Vos commandes de commentaires Gasy IA et leur statut." },
    ],
  }),
  component: () => (
    <Layout>
      <AuthGate>
        <Tracking />
      </AuthGate>
    </Layout>
  ),
});

type Row = {
  id: string;
  created_at: string;
  target_link: string;
  quantity: number;
  amount: number;
  status: string;
  comments: string;
  provider_order_id: string | null;
};

const STATUS: Record<string, string> = {
  pending: "⏳ En cours",
  processing: "🚀 En traitement",
  in_progress: "🚀 En traitement",
  done: "✅ Terminé",
  completed: "✅ Terminé",
  partial: "⚠️ Partiel",
  cancelled: "❌ Annulé",
  failed: "❌ Échec",
};

function Tracking() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("id, created_at, target_link, quantity, amount, status, comments, provider_order_id")
      .eq("user_id", user.id)
      .neq("comments", "")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as unknown as Row[]) ?? []));
  }, [user]);

  return (
    <div className="mx-auto max-w-md px-3 py-5 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold">💬 Suivi des commentaires</h1>
        <Link to="/commentaires" className="bsm-btn-gold rounded-xl px-3 py-1.5 text-xs font-bold">
          ✨ Générer
        </Link>
      </div>
      {rows === null && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {rows?.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Mbola tsy misy commande commentaires. Aucune commande pour l'instant.
        </p>
      )}
      {rows?.map((r) => {
        const list = r.comments.split("\n").filter(Boolean);
        const isOpen = open === r.id;
        return (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{list.length} commentaires</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{STATUS[r.status] ?? r.status}</span>
            </div>
            <a href={r.target_link} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-primary underline">
              {r.target_link}
            </a>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>{new Date(r.created_at).toLocaleString("fr-FR")}</span>
              <span>{formatAr(r.amount)}</span>
            </div>
            {r.provider_order_id && <p className="text-xs text-muted-foreground">N° fournisseur : {r.provider_order_id}</p>}
            <button onClick={() => setOpen(isOpen ? null : r.id)} className="mt-2 text-xs font-semibold text-primary">
              {isOpen ? "▲ Masquer la liste" : "▼ Voir les commentaires"}
            </button>
            {isOpen && (
              <ol className="mt-2 max-h-72 list-decimal space-y-1 overflow-y-auto rounded-xl bg-background/60 p-3 pl-8 text-xs">
                {list.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            )}
          </div>
        );
      })}
    </div>
  );
}
