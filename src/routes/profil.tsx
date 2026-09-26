import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil & solde — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Consultez votre solde, vos gains de parrainage, vos commandes et vos recharges.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Mon profil — BOOST SERVICE MADA" },
      { property: "og:description", content: "Solde, historique et gains de parrainage." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const { user, profile, isAdmin } = useAuth();

  const { data } = useQuery({
    queryKey: ["profil-data", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const [orders, recharges, notifs, codes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("recharges").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("protection_codes").select("*").order("created_at", { ascending: false }),
      ]);
      return {
        orders: orders.data ?? [],
        recharges: recharges.data ?? [],
        notifs: notifs.data ?? [],
        codes: codes.data ?? [],
      };
    },
  });

  return (
    <AuthGate>
    <Layout>

      <Section title="👤 Mon profil">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="bsm-card p-4">
            <p className="text-xs text-muted-foreground">👤 Nom</p>
            <p className="font-semibold">{profile?.name || "—"}</p>
            <p className="mt-3 text-xs text-muted-foreground">📱 Téléphone</p>
            <p className="font-semibold">{profile?.phone || "—"}</p>
          </div>
          <div className="bsm-card p-4">
            <p className="text-xs text-muted-foreground">💰 Solde</p>
            <p className="font-display text-2xl font-bold text-primary">
              {formatAr(profile?.balance ?? 0)}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">🎁 Gains parrainage</p>
            <p className="font-semibold text-gold">{formatAr(profile?.referral_earnings ?? 0)}</p>
            <div className="mt-3 flex gap-2">
              <Link to="/recharge" className="bsm-btn bsm-btn-primary !py-1.5 !text-xs">
                ➕ Recharge
              </Link>
              {isAdmin ? (
                <Link to="/admin" className="bsm-btn bsm-btn-gold !py-1.5 !text-xs">
                  🛠️ Admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {data?.codes?.length ? (
          <div className="bsm-card mt-4 p-4">
            <p className="font-semibold">🛡️ Mes codes Protection Compte</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.codes.map((c) => (
                <span key={c.id} className="rounded-lg bg-secondary px-3 py-1 font-mono text-sm text-gold">
                  {c.code}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="bsm-card mt-4 p-4">
          <p className="font-semibold">🔔 Notifications</p>
          <div className="mt-2 space-y-2">
            {(data?.notifs ?? []).map((n) => (
              <div key={n.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))}
            {!data?.notifs?.length ? (
              <p className="text-xs text-muted-foreground">Aucune notification.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="bsm-card p-4">
            <p className="font-semibold">📦 Historique commandes</p>
            <div className="mt-2 space-y-2">
              {(data?.orders ?? []).map((o) => (
                <div key={o.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                  <p className="font-medium">{o.service_label}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.quantity} • {formatAr(Number(o.amount))} • {o.status}
                  </p>
                </div>
              ))}
              {!data?.orders?.length ? (
                <p className="text-xs text-muted-foreground">Aucune commande.</p>
              ) : null}
            </div>
          </div>
          <div className="bsm-card p-4">
            <p className="font-semibold">💳 Historique recharges</p>
            <div className="mt-2 space-y-2">
              {(data?.recharges ?? []).map((r) => (
                <div key={r.id} className="rounded-lg bg-secondary/60 p-3 text-sm">
                  <p className="font-medium">{formatAr(Number(r.amount))}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.sender_phone} • réf {r.reference} • {r.status}
                  </p>
                </div>
              ))}
              {!data?.recharges?.length ? (
                <p className="text-xs text-muted-foreground">Aucune recharge.</p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>
    </Layout>
    </AuthGate>
  );
}
