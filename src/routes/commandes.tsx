import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/commandes")({
  head: () => ({
    meta: [
      { title: "Mes commandes — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Suivez le statut de vos commandes de boost : en attente, en cours ou terminée.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Mes commandes — BOOST SERVICE MADA" },
      { property: "og:description", content: "Suivi en temps réel de vos commandes." },
    ],
  }),
  component: OrdersPage,
});

export const STATUS: Record<string, string> = {
  pending: "🔵 En cours",
  processing: "🔵 En cours",
  done: "🟢 Terminée",
  rejected: "🔴 Refusée",
};

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AuthGate>
    <Layout>
      <Section title="📦 Mes commandes">
        {!user ? (
          <Link to="/auth" className="bsm-btn bsm-btn-primary">
            Se connecter
          </Link>
        ) : (
          <div className="space-y-3">
            {(orders ?? []).map((o) => (
              <div key={o.id} className="bsm-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{o.service_label}</p>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                    {STATUS[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground break-all">{o.target_link}</p>
                <p className="mt-1 text-sm text-gold">
                  {o.quantity} • {formatAr(Number(o.amount))}
                </p>
                {o.provider_order_id ? (
                  <p className="mt-1 text-[11px] text-primary">
                    🆔 N° fournisseur SMMGen : {o.provider_order_id}
                    {o.provider_status ? ` • ${o.provider_status}` : ""}
                    {o.remains !== null && o.remains !== undefined ? ` • restant ${o.remains}` : ""}
                  </p>
                ) : null}
                {o.api_error ? (
                  <p className="mt-1 text-[11px] text-destructive">⚠️ {o.api_error}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}
            {!orders?.length ? (
              <p className="text-sm text-muted-foreground">Aucune commande pour l'instant.</p>
            ) : null}
          </div>
        )}
      </Section>
    </Layout>
    </AuthGate>
  );
}
