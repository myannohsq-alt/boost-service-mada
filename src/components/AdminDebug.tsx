import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getSmmgenStats,
  listFailedOrders,
  retryOrder,
  smmgenDebug,
} from "@/lib/sync-admin.functions";

export function AdminDebug({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const statsFn = useServerFn(getSmmgenStats);
  const failedFn = useServerFn(listFailedOrders);
  const debugFn = useServerFn(smmgenDebug);
  const retryFn = useServerFn(retryOrder);
  const [orderRef, setOrderRef] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["smmgen-stats"],
    queryFn: () => statsFn({ data: undefined as never }),
    refetchInterval: 60_000,
  });

  const { data: failed } = useQuery({
    queryKey: ["failed-orders"],
    queryFn: () => failedFn({ data: undefined as never }),
    refetchInterval: 60_000,
  });

  const test = useMutation({
    mutationFn: (v: { test: "connection" | "balance" | "services" | "status"; order?: string }) =>
      debugFn({ data: v }),
    onSuccess: async (r) => {
      onDone(`${r.ok ? "✅" : "❌"} ${r.detail}`);
      await qc.invalidateQueries({ queryKey: ["smmgen-stats"] });
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const retry = useMutation({
    mutationFn: (orderId: string) => retryFn({ data: { orderId } }),
    onSuccess: async (r) => {
      onDone(`🔁 ${r.status} — ${r.detail || "relancé"}`);
      await qc.invalidateQueries({ queryKey: ["failed-orders"] });
      await qc.invalidateQueries({ queryKey: ["smmgen-stats"] });
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const cards: { label: string; value: string }[] = [
    { label: "💵 Solde SMMGen", value: stats?.balance || (stats?.balanceError ? "erreur" : "…") },
    { label: "📥 Services importés", value: String(stats?.imported ?? "…") },
    { label: "🔗 Services liés", value: String(stats?.mapped ?? "…") },
    { label: "📤 Commandes envoyées", value: String(stats?.sentOrders ?? "…") },
    { label: "❌ Commandes échouées", value: String(stats?.failedOrders ?? "…") },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="bsm-card p-3">
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
            <p className="font-display text-base font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>
      {stats?.balanceError ? (
        <p className="text-xs text-destructive">Solde indisponible : {stats.balanceError}</p>
      ) : null}

      <div className="bsm-card space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">🧪 Panneau de test</h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="bsm-btn !py-2 !text-xs"
            disabled={test.isPending}
            onClick={() => test.mutate({ test: "connection" })}
          >
            🔌 Tester la connexion
          </button>
          <button
            className="bsm-btn !py-2 !text-xs"
            disabled={test.isPending}
            onClick={() => test.mutate({ test: "balance" })}
          >
            💵 Tester le solde
          </button>
          <button
            className="bsm-btn !py-2 !text-xs"
            disabled={test.isPending}
            onClick={() => test.mutate({ test: "services" })}
          >
            📚 Tester les services
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="bsm-input w-full !py-1 !text-xs"
            placeholder="ID commande SMMGen à vérifier"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
          />
          <button
            className="bsm-btn !py-1 !text-xs"
            disabled={test.isPending}
            onClick={() => test.mutate({ test: "status", order: orderRef })}
          >
            🔍 Statut
          </button>
        </div>
      </div>

      <div className="bsm-card p-4">
        <h3 className="mb-2 font-display text-sm font-bold">
          ❌ Commandes en erreur ({failed?.length ?? 0})
        </h3>
        <div className="space-y-2">
          {(failed ?? []).map((o) => (
            <div key={o.id} className="rounded-lg bg-secondary/60 p-2 text-xs">
              <p className="font-semibold">
                {o.service_label} × {o.quantity} — {o.status}
              </p>
              <p className="break-all text-muted-foreground">{o.target_link}</p>
              <p className="text-destructive">{o.api_error || o.provider_error}</p>
              <p className="text-muted-foreground">
                {o.retry_count} tentative(s) •{" "}
                {new Date(o.created_at as string).toLocaleString("fr-FR")}
              </p>
              {!o.provider_order_id ? (
                <button
                  className="bsm-btn !mt-1 !py-1 !text-xs"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(o.id)}
                >
                  🔁 Réessayer
                </button>
              ) : null}
            </div>
          ))}
          {!failed?.length ? (
            <p className="text-sm text-muted-foreground">Aucune commande en erreur 🎉</p>
          ) : null}
        </div>
      </div>

      <div className="bsm-card p-4">
        <h3 className="mb-2 font-display text-sm font-bold">🧾 Journal API SMMGen</h3>
        <div className="space-y-1">
          {(stats?.logs ?? []).map((l) => (
            <p key={l.id} className="text-[11px]">
              <span className={l.ok ? "text-primary" : "text-destructive"}>{l.ok ? "✅" : "❌"}</span>{" "}
              {l.action} • {l.status_code ?? "—"} • {l.duration_ms} ms •{" "}
              {new Date(l.created_at as string).toLocaleString("fr-FR")}
              {l.error ? <span className="text-destructive"> — {l.error}</span> : null}
            </p>
          ))}
          {!stats?.logs?.length ? (
            <p className="text-sm text-muted-foreground">Aucun appel enregistré.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
