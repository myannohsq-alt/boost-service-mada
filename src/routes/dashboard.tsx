import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Solde, commandes, historique et notifications de votre compte BOOST SERVICE MADA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Tableau de bord — BOOST SERVICE MADA" },
      { property: "og:description", content: "Suivez votre solde et vos commandes en temps réel." },
    ],
  }),
  component: DashboardPage,
});

export const STATUS_LABEL: Record<string, string> = {
  pending: "🟡 En attente",
  processing: "🔵 En cours",
  done: "🟢 Terminé",
  rejected: "🔴 Annulé",
  cancelled: "🔴 Annulé",
};

function DashboardPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [orders, recharges, notifs] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("recharges").select("*").order("created_at", { ascending: false }).limit(30),
        supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      return {
        orders: orders.data ?? [],
        recharges: recharges.data ?? [],
        notifs: notifs.data ?? [],
      };
    },
  });

  const orders = data?.orders ?? [];
  const unread = (data?.notifs ?? []).filter((n) => !n.read).length;

  return (
    <AuthGate>
      <Layout>
        <Section title="📊 Tableau de bord" subtitle={`Bonjour ${profile?.name || ""} 👋`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="bsm-card p-4">
              <p className="text-xs text-muted-foreground">💰 Mon solde</p>
              <p className="font-display text-xl font-bold text-primary">
                {formatAr(profile?.balance ?? 0)}
              </p>
              <Link to="/recharge" className="bsm-btn bsm-btn-gold mt-2 block !py-1.5 text-center !text-[11px]">
                ➕ Recharger
              </Link>
            </div>
            <div className="bsm-card p-4">
              <p className="text-xs text-muted-foreground">📦 Mes commandes</p>
              <p className="font-display text-xl font-bold">{orders.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {orders.filter((o) => o.status === "pending" || o.status === "processing").length} en
                cours
              </p>
            </div>
            <div className="bsm-card p-4">
              <p className="text-xs text-muted-foreground">📜 Historique</p>
              <p className="font-display text-xl font-bold">{(data?.recharges ?? []).length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">recharges</p>
            </div>
            <div className="bsm-card p-4">
              <p className="text-xs text-muted-foreground">🔔 Notifications</p>
              <p className="font-display text-xl font-bold text-gold">{unread}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">non lues</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="bsm-card p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">📦 Mes commandes</p>
                <Link to="/services" className="text-xs text-primary">
                  + Nouvelle
                </Link>
              </div>
              <div className="mt-3 space-y-2">
                {orders.slice(0, 8).map((o) => (
                  <div key={o.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{o.service_label}</p>
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-[11px]">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.quantity} • {formatAr(Number(o.amount))} •{" "}
                      {new Date(o.created_at).toLocaleDateString("fr-FR")}
                    </p>
                    {o.provider_order_id ? (
                      <p className="mt-1 text-[11px] text-primary">
                        🆔 SMMGen #{o.provider_order_id}
                        {o.provider_status ? ` • ${o.provider_status}` : ""}
                      </p>
                    ) : null}
                  </div>
                ))}
                {!orders.length ? (
                  <p className="text-xs text-muted-foreground">Aucune commande.</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bsm-card p-4">
                <p className="font-semibold">🔔 Notifications</p>
                <div className="mt-3 space-y-2">
                  {(data?.notifs ?? []).slice(0, 6).map((n) => (
                    <button
                      key={n.id}
                      onClick={async () => {
                        await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                        void qc.invalidateQueries({ queryKey: ["dashboard"] });
                      }}
                      className={`w-full rounded-xl p-3 text-left text-sm transition-colors ${
                        n.read ? "bg-secondary/40" : "bg-secondary"
                      }`}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                    </button>
                  ))}
                  {!data?.notifs?.length ? (
                    <p className="text-xs text-muted-foreground">Aucune notification.</p>
                  ) : null}
                </div>
              </div>

              <div className="bsm-card p-4">
                <p className="font-semibold">📜 Historique recharges</p>
                <div className="mt-3 space-y-2">
                  {(data?.recharges ?? []).slice(0, 6).map((r) => (
                    <div key={r.id} className="rounded-xl bg-secondary/60 p-3 text-sm">
                      <p className="font-medium text-gold">{formatAr(Number(r.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        réf {r.reference} • {r.status}
                      </p>
                    </div>
                  ))}
                  {!data?.recharges?.length ? (
                    <p className="text-xs text-muted-foreground">Aucune recharge.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}
