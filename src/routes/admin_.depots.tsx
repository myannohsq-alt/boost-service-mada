import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { depotsClient, normDepot } from "@/lib/external-depots";
import { formatAr } from "@/lib/i18n";

export const Route = createFileRoute("/admin_/depots")({
  head: () => ({
    meta: [
      { title: "Dépôts SMS — Admin BOOST SERVICE MADA" },
      { name: "description", content: "Liste des dépôts Mobile Money reçus par SMS." },
      { property: "og:title", content: "Dépôts SMS — Admin" },
      { property: "og:description", content: "Liste des dépôts Mobile Money reçus par SMS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminDepots,
});

function AdminDepots() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) void navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate]);

  const { data, refetch } = useQuery({
    queryKey: ["ext-depots"],
    enabled: isAdmin,
    refetchInterval: 15000,
    queryFn: async () => {
      const [{ data: rows }, { data: claims }] = await Promise.all([
        depotsClient().from("Depots").select("*").limit(1000),
        supabase.from("external_depot_claims").select("depot_id,user_id"),
      ]);
      const claimed = new Map((claims ?? []).map((c) => [c.depot_id, c.user_id]));
      return ((rows ?? []) as Record<string, unknown>[]).map(normDepot).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((r) => ({ ...r, claimedBy: claimed.get(String(r.id)) ?? null }));
    },
  });

  const digits = q.replace(/\D/g, "");
  const list = (data ?? []).filter((r) => !digits || (r.message ?? "").replace(/\D/g, "").includes(digits));

  if (!isAdmin) return null;
  return (
    <Layout>
      <Section title="📩 Dépôts SMS" subtitle="Tous les SMS reçus dans Depots">
        <div className="flex gap-2">
          <input className="bsm-input flex-1" placeholder="Filtrer par numéro" value={q} onChange={(e) => setQ(e.target.value)} inputMode="tel" />
          <button className="bsm-btn !px-3" onClick={() => void refetch()}>🔄</button>
        </div>
        <div className="mt-4 space-y-2">
          {list.map((r) => (
            <div key={String(r.id)} className="bsm-card p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-primary">{formatAr(Number(r.montant))}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
              </div>
              <p className="mt-1 break-words text-muted-foreground">{r.message}</p>
              <p className="mt-1 text-xs">{r.claimedBy ? "✅ Crédité" : "⏳ Non réclamé"}</p>
            </div>
          ))}
          {!list.length ? <p className="text-sm text-muted-foreground">Aucun dépôt.</p> : null}
        </div>
      </Section>
    </Layout>
  );
}
