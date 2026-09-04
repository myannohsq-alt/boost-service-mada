import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listLocalServices,
  runAutoMap,
  setServiceMapping,
} from "@/lib/sync-admin.functions";

export function AdminMapping({ onDone }: { onDone: (msg: string) => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listLocalServices);
  const autoFn = useServerFn(runAutoMap);
  const setFn = useServerFn(setServiceMapping);

  const [search, setSearch] = useState("");
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: rows } = useQuery({
    queryKey: ["local-services", search, onlyUnmapped],
    queryFn: () => listFn({ data: { search, onlyUnmapped } }),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["local-services"] });
    await qc.invalidateQueries({ queryKey: ["smmgen-stats"] });
  };

  const auto = useMutation({
    mutationFn: () => autoFn({ data: undefined as never }),
    onSuccess: async (r) => {
      onDone(`🤖 ${r.mapped} service(s) liés automatiquement • ${r.unmapped.length} non liés`);
      await refresh();
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const manual = useMutation({
    mutationFn: (v: { serviceId: string; providerServiceId: string }) => setFn({ data: v }),
    onSuccess: async (r) => {
      onDone(`✅ ${r.detail}`);
      await refresh();
    },
    onError: (e: Error) => onDone(`❌ ${e.message}`),
  });

  const mappedCount = (rows ?? []).filter((r) => r.provider_service_id).length;

  return (
    <div className="bsm-card space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold">
          🔗 Liaison des services ({mappedCount}/{rows?.length ?? 0} liés)
        </h3>
        <button
          className="bsm-btn bsm-btn-primary !py-2 !text-xs"
          disabled={auto.isPending}
          onClick={() => auto.mutate()}
        >
          {auto.isPending ? "⏳ Liaison…" : "🤖 Liaison automatique"}
        </button>
      </div>

      <input
        className="bsm-input w-full"
        placeholder="Rechercher un service local…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={onlyUnmapped}
          onChange={(e) => setOnlyUnmapped(e.target.checked)}
        />
        Afficher uniquement les services non liés
      </label>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {(rows ?? []).map((r) => (
          <div key={r.id} className="rounded-lg bg-secondary/60 p-2 text-xs">
            <p className="font-semibold">
              {r.provider_service_id ? "✅" : "⚠️"} {r.platform} — {r.name_fr}
            </p>
            <p className="text-muted-foreground">
              unité {r.unit} • {r.provider_service_id ? `SMMGen #${r.provider_service_id}` : "non lié"}
              {r.provider_min ? ` • min ${r.provider_min} / max ${r.provider_max}` : ""}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="bsm-input w-40 !py-1 !text-xs"
                placeholder="ID SMMGen"
                value={draft[r.id] ?? r.provider_service_id ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
              />
              <button
                className="bsm-btn !py-1 !text-xs"
                disabled={manual.isPending}
                onClick={() =>
                  manual.mutate({
                    serviceId: r.id,
                    providerServiceId: draft[r.id] ?? r.provider_service_id ?? "",
                  })
                }
              >
                💾 Lier
              </button>
              {r.provider_service_id ? (
                <button
                  className="bsm-btn !py-1 !text-xs"
                  disabled={manual.isPending}
                  onClick={() => manual.mutate({ serviceId: r.id, providerServiceId: "" })}
                >
                  ✖️ Retirer
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {!rows?.length ? <p className="text-sm text-muted-foreground">Aucun service.</p> : null}
      </div>
    </div>
  );
}
