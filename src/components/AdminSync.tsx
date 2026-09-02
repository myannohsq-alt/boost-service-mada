import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getSyncOverview,
  saveProviderSettings,
  resumeSync,
  triggerSyncJob,
  listProviderServices,
  toggleProviderService,
} from "@/lib/sync-admin.functions";

function ServicePicker({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listProviderServices);
  const toggleFn = useServerFn(toggleProviderService);
  const [search, setSearch] = useState("Malagasy");
  const [onlySelected, setOnlySelected] = useState(false);

  const { data: rows } = useQuery({
    queryKey: ["provider-services", search, onlySelected],
    queryFn: () => listFn({ data: { search, onlySelected } }),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; selected: boolean }) => toggleFn({ data: v }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["provider-services"] });
      await qc.invalidateQueries({ queryKey: ["sync-overview"] });
      onDone("✅ Sélection mise à jour — pensez à publier.");
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  return (
    <div className="bsm-card space-y-3 p-4">
      <h3 className="font-display text-sm font-bold">🇲🇬 Choisir les services à afficher</h3>
      <input
        className="bsm-input w-full"
        placeholder="Rechercher (ex : Malagasy, Facebook…)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={onlySelected}
          onChange={(e) => setOnlySelected(e.target.checked)}
        />
        Afficher uniquement les services sélectionnés
      </label>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {(rows ?? []).map((r) => (
          <label
            key={r.id}
            className="flex items-start gap-2 rounded-lg bg-secondary/60 p-2 text-xs"
          >
            <input
              type="checkbox"
              checked={Boolean(r.selected)}
              onChange={(e) => toggle.mutate({ id: r.id, selected: e.target.checked })}
            />
            <span>
              <span className="font-semibold">{r.name}</span>
              <span className="block text-muted-foreground">
                #{r.provider_service_id} • {r.category} • {r.rate_usd} USD/1000 • min {r.min_qty}
              </span>
            </span>
          </label>
        ))}
        {!rows?.length ? (
          <p className="text-sm text-muted-foreground">Aucun service trouvé.</p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminSync({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const overviewFn = useServerFn(getSyncOverview);
  const saveFn = useServerFn(saveProviderSettings);
  const resumeFn = useServerFn(resumeSync);
  const triggerFn = useServerFn(triggerSyncJob);

  const { data, isLoading } = useQuery({
    queryKey: ["sync-overview"],
    queryFn: () => overviewFn({ data: undefined as never }),
    refetchInterval: 20_000,
  });

  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [rate, setRate] = useState<string | null>(null);
  const [markup, setMarkup] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean | null>(null);

  const s = data?.settings;
  const url = apiUrl ?? s?.api_url ?? "https://smmgen.com/api/v2";
  const arPerUsd = rate ?? String(s?.ar_per_usd ?? 4500);
  const markupPct = markup ?? String(s?.markup_percent ?? 0);
  const autoFulfill = auto ?? s?.auto_fulfill ?? true;

  const refresh = () => qc.invalidateQueries({ queryKey: ["sync-overview"] });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          api_url: url,
          api_key: apiKey,
          ar_per_usd: Number(arPerUsd) || 4500,
          markup_percent: Number(markupPct) || 0,
          auto_fulfill: autoFulfill,
        },
      }),
    onSuccess: async () => {
      setApiKey("");
      onDone("✅ Réglages SMMGen enregistrés");
      await refresh();
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const job = useMutation({
    mutationFn: (kind: "import_services" | "publish_services" | "reconcile_orders") =>
      triggerFn({ data: { kind } }),
    onSuccess: async (r) => {
      onDone(`🔄 ${r.status} — ${r.detail || "terminé"}`);
      await refresh();
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const resume = useMutation({
    mutationFn: () => resumeFn({ data: undefined as never }),
    onSuccess: async () => {
      onDone("▶️ Synchronisation relancée");
      await refresh();
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">⏳ Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="bsm-card space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">🔑 Connexion SMMGen</h3>
        <label className="block text-xs text-muted-foreground">URL API</label>
        <input className="bsm-input w-full" value={url} onChange={(e) => setApiUrl(e.target.value)} />
        <label className="block text-xs text-muted-foreground">
          Clé API {s?.has_key ? `(actuelle : ${s.key_hint})` : "(non configurée)"}
        </label>
        <input
          className="bsm-input w-full"
          placeholder="Laisser vide pour conserver la clé actuelle"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground">Taux Ar / USD</label>
            <input
              className="bsm-input w-full"
              value={arPerUsd}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground">Marge (%)</label>
            <input
              className="bsm-input w-full"
              value={markupPct}
              onChange={(e) => setMarkup(e.target.value)}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoFulfill}
            onChange={(e) => setAuto(e.target.checked)}
          />
          Envoi automatique des commandes à SMMGen
        </label>
        <button
          className="bsm-btn bsm-btn-primary !py-2 !text-xs"
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          💾 Enregistrer
        </button>
      </div>

      <div className="bsm-card space-y-3 p-4">
        <h3 className="font-display text-sm font-bold">
          🔄 Actions ({data?.selectedCount ?? 0} / {data?.providerCount ?? 0} services sélectionnés)
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            className="bsm-btn bsm-btn-primary !py-2 !text-xs"
            disabled={job.isPending}
            onClick={() => job.mutate("import_services")}
          >
            ⬇️ Importer le catalogue
          </button>
          <button
            className="bsm-btn !py-2 !text-xs"
            disabled={job.isPending}
            onClick={() => job.mutate("publish_services")}
          >
            🚀 Publier les services choisis
          </button>
          <button
            className="bsm-btn !py-2 !text-xs"
            disabled={job.isPending}
            onClick={() => job.mutate("reconcile_orders")}
          >
            🔁 Synchroniser les statuts
          </button>
        </div>
        {s?.paused ? (
          <div className="rounded-lg bg-destructive/15 p-3 text-xs">
            ⏸️ En pause : {s.pause_reason || "erreur fournisseur"}
            <button className="bsm-btn !ml-2 !py-1 !text-xs" onClick={() => resume.mutate()}>
              ▶️ Reprendre
            </button>
          </div>
        ) : null}
      </div>

      <div className="bsm-card p-4">
        <h3 className="mb-2 font-display text-sm font-bold">📜 Historique des synchronisations</h3>
        <div className="space-y-2">
          {(data?.runs ?? []).map((r) => (
            <div key={r.id} className="rounded-lg bg-secondary/60 p-2 text-xs">
              <p className="font-semibold">
                {r.status === "ok" ? "✅" : r.status === "error" ? "❌" : "⏸️"} {r.kind} —{" "}
                {new Date(r.started_at as string).toLocaleString("fr-FR")}
              </p>
              <p className="text-muted-foreground">
                {r.items_processed} traité(s) • {r.items_failed} échec(s) {r.detail ? `• ${r.detail}` : ""}
              </p>
              {r.error ? <p className="text-destructive">{r.error}</p> : null}
            </div>
          ))}
          {!data?.runs?.length ? (
            <p className="text-sm text-muted-foreground">Aucune synchronisation.</p>
          ) : null}
        </div>
      </div>

      <div className="bsm-card p-4">
        <h3 className="mb-2 font-display text-sm font-bold">🗂️ Tâches récentes</h3>
        <div className="space-y-2">
          {(data?.jobs ?? []).map((j) => (
            <div key={j.id} className="rounded-lg bg-secondary/60 p-2 text-xs">
              <p className="font-semibold">
                {j.kind} — {j.status} ({j.attempts} tentative(s))
              </p>
              {j.last_error ? <p className="text-destructive">{j.last_error}</p> : null}
            </div>
          ))}
          {!data?.jobs?.length ? (
            <p className="text-sm text-muted-foreground">Aucune tâche.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
