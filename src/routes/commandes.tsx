import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/commandes")({
  head: () => ({
    meta: [
      { title: "Suivi des commandes — BOOST SERVICE MADA" },
      { name: "description", content: "Suivez vos commandes de boost et l'historique de vos recharges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Suivi des commandes — BOOST SERVICE MADA" },
      { property: "og:description", content: "Historique des commandes et des recharges." },
    ],
  }),
  component: OrdersPage,
});

export const STATUS: Record<string, string> = {
  pending: "En cours",
  processing: "En cours",
  done: "Terminé",
  rejected: "Refusé",
  failed: "Échoué",
};
const RSTATUS: Record<string, string> = { pending: "En attente", approved: "Validé", rejected: "Refusé" };
const METHOD: Record<string, string> = { mvola: "MVola", orange: "Orange Money", airtel: "Airtel Money" };

const ar = (n: number) => `${Math.round(n).toLocaleString("de-DE")} Ar`;
const d = (s: string) => new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });

function OrdersPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"orders" | "recharges">("orders");
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("orders").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: recharges = [] } = useQuery({
    queryKey: ["my-recharges", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.from("recharges").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const last = orders[0];
  const delivered = last
    ? last.status === "done" ? last.quantity : last.remains != null ? Math.max(0, last.quantity - last.remains) : 0
    : 0;
  const pct = last ? Math.min(100, (delivered / Math.max(1, last.quantity)) * 100) : 0;
  const platform = last?.target_link?.includes("tiktok") ? "TikTok" : last?.target_link?.includes("instagram") ? "Instagram" : last?.target_link?.includes("youtu") ? "YouTube" : "Facebook";

  return (
    <AuthGate>
      <Layout>
        <div className="min-h-screen bg-[#F9FAFB] p-6 text-black">
          <div className="mx-auto max-w-[800px] space-y-5">
            {!user ? (
              <Link to="/auth" className="bsm-btn bsm-btn-primary">Se connecter</Link>
            ) : last ? (
              <div className="rounded-[24px] border border-[#E5E7EB] bg-white p-7">
                <div className="mb-5 flex justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-black text-xs font-bold text-white">BSM</div>
                    <div>
                      <div className="text-[13px] font-bold">BOOST SERVICE MADA</div>
                      <div className="font-mono text-[11px] text-gray-400">#BSM-{new Date(last.created_at).getFullYear()}-{last.id.slice(0, 4).toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{STATUS[last.status] ?? last.status}
                  </div>
                </div>
                <div className="mb-6 h-px bg-gray-100" />
                <div className="grid grid-cols-3 gap-6">
                  <div><div className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Service</div><div className="font-bold">{last.service_label}</div><div className="mt-2 inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">{platform}</div></div>
                  <div><div className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Quantité</div><div className="text-[22px] font-bold">{last.quantity}</div></div>
                  <div><div className="mb-2 text-[10px] font-semibold uppercase text-gray-400">Tarifs</div><div className="text-[22px] font-bold text-[#FF6A00]">{ar(Number(last.amount))}</div></div>
                </div>
                <div className="mt-7">
                  <div className="mb-2 flex justify-between text-xs text-gray-500"><span>Progression</span><span><b className="text-black">{delivered}</b> / {last.quantity} livré</span></div>
                  <div className="h-1.5 rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#FF6A00]" style={{ width: `${pct}%` }} /></div>
                </div>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white">
              <div className="flex border-b px-2">
                <button onClick={() => setTab("orders")} className={`border-b-2 px-5 py-4 text-sm font-semibold ${tab === "orders" ? "border-[#FF6A00]" : "border-transparent text-gray-400"}`}>Historique Commandes</button>
                <button onClick={() => setTab("recharges")} className={`border-b-2 px-5 py-4 text-sm font-semibold ${tab === "recharges" ? "border-[#FF6A00]" : "border-transparent text-gray-400"}`}>Historique Recharges</button>
              </div>
              <div className="overflow-x-auto">
                {tab === "orders" ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="text-[10px] uppercase text-gray-400"><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Service</th><th className="px-5 py-3 text-left">Tarifs</th><th className="px-5 py-3 text-left">Statut</th></tr></thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t"><td className="px-5 py-4">{d(o.created_at)}</td><td className="px-5 py-4">{o.service_label}</td><td className="px-5 py-4 font-bold text-red-500">-{ar(Number(o.amount))}</td><td className="px-5 py-4">{STATUS[o.status] ?? o.status}</td></tr>
                      ))}
                      {!orders.length ? <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400">Aucune commande</td></tr> : null}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr className="text-[10px] uppercase text-gray-400"><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Méthode</th><th className="px-5 py-3 text-left">Montant</th><th className="px-5 py-3 text-left">Statut</th></tr></thead>
                    <tbody>
                      {recharges.map((r) => (
                        <tr key={r.id} className="border-t"><td className="px-5 py-4">{d(r.created_at)}</td><td className="px-5 py-4">{METHOD[r.method] ?? r.method}</td><td className="px-5 py-4 font-bold text-green-500">+{ar(Number(r.amount))}</td><td className="px-5 py-4">{RSTATUS[r.status] ?? r.status}</td></tr>
                      ))}
                      {!recharges.length ? <tr><td colSpan={4} className="px-5 py-6 text-center text-gray-400">Aucune recharge</td></tr> : null}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </AuthGate>
  );
}
