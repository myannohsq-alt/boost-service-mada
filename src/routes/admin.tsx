import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AdminSync } from "@/components/AdminSync";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — BOOST SERVICE MADA" },
      { name: "description", content: "Espace administrateur : recharges, commandes et contenus." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administration — BOOST SERVICE MADA" },
      { property: "og:description", content: "Espace réservé aux administrateurs." },
    ],
  }),
  component: AdminPage,
});

const TABS = ["Recharges", "Commandes", "Services", "SMMGen", "Utilisateurs", "Contenus"] as const;

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Recharges");
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth" });
    else if (!isAdmin) void navigate({ to: "/profil" });
  }, [loading, user, isAdmin, navigate]);

  const { data } = useQuery({
    queryKey: ["admin-data"],
    enabled: isAdmin,
    queryFn: async () => {
      const [recharges, orders, profiles] = await Promise.all([
        supabase.from("recharges").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      return {
        recharges: recharges.data ?? [],
        orders: orders.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  const run = async (fn: () => Promise<{ error: unknown }>, ok: string) => {
    setMsg(null);
    const { error } = await fn();
    if (error) setMsg(`❌ ${(error as { message?: string }).message ?? "Erreur"}`);
    else {
      setMsg(ok);
      await qc.invalidateQueries({ queryKey: ["admin-data"] });
    }
  };

  if (loading) return <Layout><Section title="⏳ Chargement…" /></Layout>;

  if (!isAdmin) {
    return (
      <Layout>
        <Section title="🔒 Accès refusé" subtitle="Cette page est réservée aux administrateurs." />
      </Layout>
    );
  }

  return (
    <Layout>
      <Section title="⚙️ Administration" subtitle="Gestion complète de la plateforme.">
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {msg ? <p className="mb-4 rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}

        {tab === "Recharges" ? (
          <div className="space-y-3">
            {(data?.recharges ?? []).map((r) => (
              <div key={r.id} className="bsm-card p-4">
                <p className="font-semibold text-gold">{formatAr(Number(r.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  Envoi : {r.sender_phone} • Réf : {r.reference} • {r.status}
                </p>
                {r.status === "pending" ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      className="bsm-btn bsm-btn-primary !py-2 !text-xs"
                      onClick={() =>
                        run(
                          () => supabase.rpc("approve_recharge", { _recharge_id: r.id }) as never,
                          "✅ Recharge approuvée",
                        )
                      }
                    >
                      ✅ Approuver
                    </button>
                    <button
                      className="bsm-btn !bg-destructive !py-2 !text-xs !text-destructive-foreground"
                      onClick={() =>
                        run(
                          () =>
                            supabase
                              .from("recharges")
                              .update({ status: "rejected" })
                              .eq("id", r.id) as never,
                          "🔴 Recharge refusée",
                        )
                      }
                    >
                      ❌ Refuser
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {!data?.recharges?.length ? (
              <p className="text-sm text-muted-foreground">Aucune recharge.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "Commandes" ? (
          <div className="space-y-3">
            {(data?.orders ?? []).map((o) => (
              <div key={o.id} className="bsm-card p-4">
                <p className="font-semibold">{o.service_label}</p>
                <p className="break-all text-xs text-muted-foreground">{o.target_link}</p>
                <p className="text-sm text-gold">
                  {o.quantity} • {formatAr(Number(o.amount))} • {o.status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["processing", "done", "rejected"].map((s) => (
                    <button
                      key={s}
                      className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold"
                      onClick={() =>
                        run(
                          () =>
                            supabase.from("orders").update({ status: s }).eq("id", o.id) as never,
                          `✅ Statut : ${s}`,
                        )
                      }
                    >
                      {s === "processing" ? "🔵 En cours" : s === "done" ? "🟢 Terminée" : "🔴 Refusée"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!data?.orders?.length ? (
              <p className="text-sm text-muted-foreground">Aucune commande.</p>
            ) : null}
          </div>
        ) : null}

        {tab === "Utilisateurs" ? (
          <div className="space-y-3">
            {(data?.profiles ?? []).map((p) => (
              <div key={p.id} className="bsm-card p-4">
                <p className="font-semibold">{p.name || "Utilisateur"}</p>
                <p className="text-xs text-muted-foreground">
                  📧 {p.email || "—"} • 📞 {p.phone || "—"} • Code : {p.referral_code}
                </p>
                <p className="text-sm text-gold">💰 {formatAr(Number(p.balance))}</p>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "Services" ? <AdminServices onDone={setMsg} /> : null}

        {tab === "SMMGen" ? <AdminSync onDone={setMsg} /> : null}

        {tab === "Contenus" ? <AdminContent onDone={setMsg} /> : null}
      </Section>
    </Layout>
  );
}

function AdminContent({ onDone }: { onDone: (m: string) => void }) {
  const [news, setNews] = useState({ title: "", content: "" });
  const [promo, setPromo] = useState({ title: "", description: "", discount: "" });
  const [code, setCode] = useState("");

  return (
    <div className="space-y-4">
      <div className="bsm-card p-4">
        <p className="font-semibold">📰 Publier une actualité</p>
        <input
          className="bsm-input mt-2"
          placeholder="Titre"
          value={news.title}
          onChange={(e) => setNews({ ...news, title: e.target.value })}
        />
        <textarea
          className="bsm-input mt-2 min-h-24"
          placeholder="Contenu"
          value={news.content}
          onChange={(e) => setNews({ ...news, content: e.target.value })}
        />
        <button
          className="bsm-btn bsm-btn-primary mt-3 !py-2 !text-xs"
          onClick={async () => {
            const { error } = await supabase.from("news").insert(news);
            onDone(error ? `❌ ${error.message}` : "✅ Actualité publiée");
            if (!error) setNews({ title: "", content: "" });
          }}
        >
          Publier
        </button>
      </div>

      <div className="bsm-card p-4">
        <p className="font-semibold">🎉 Nouvelle promotion</p>
        <input
          className="bsm-input mt-2"
          placeholder="Titre"
          value={promo.title}
          onChange={(e) => setPromo({ ...promo, title: e.target.value })}
        />
        <input
          className="bsm-input mt-2"
          placeholder="Description"
          value={promo.description}
          onChange={(e) => setPromo({ ...promo, description: e.target.value })}
        />
        <input
          className="bsm-input mt-2"
          type="number"
          placeholder="Réduction %"
          value={promo.discount}
          onChange={(e) => setPromo({ ...promo, discount: e.target.value })}
        />
        <button
          className="bsm-btn bsm-btn-gold mt-3 !py-2 !text-xs"
          onClick={async () => {
            const { error } = await supabase.from("promotions").insert({
              title: promo.title,
              description: promo.description,
              discount: Number(promo.discount) || 0,
              active: true,
            });
            onDone(error ? `❌ ${error.message}` : "✅ Promotion créée");
            if (!error) setPromo({ title: "", description: "", discount: "" });
          }}
        >
          Créer
        </button>
      </div>

      <div className="bsm-card p-4">
        <p className="font-semibold">🔑 Générer un code Protection Compte</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            className="bsm-input flex-1"
            placeholder="BSM-XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            className="bsm-btn bsm-btn-primary !py-2 !text-xs"
            onClick={async () => {
              const value = code.trim() || `BSM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
              const { error } = await supabase.from("protection_codes").insert({ code: value });
              onDone(error ? `❌ ${error.message}` : `✅ Code créé : ${value}`);
              if (!error) setCode("");
            }}
          >
            Générer
          </button>
        </div>
      </div>
    </div>
  );
}

type AdminService = {
  id: string;
  platform: string;
  category: string;
  name_fr: string;
  name_mg: string;
  unit: number;
  price: number;
  note: string | null;
  active: boolean;
  badge: string;
  delivery_time: string;
  sort_order: number;
};

const BADGE_OPTIONS = [
  { value: "", label: "Aucun badge" },
  { value: "top", label: "🔥 Top Populaire" },
  { value: "ultra", label: "⚡ Ultra" },
  { value: "reco", label: "⭐ Recommandé" },
  { value: "new", label: "🆕 Nouveau" },
];

function AdminServices({ onDone }: { onDone: (m: string) => void }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("sort_order");
      return (data ?? []) as unknown as AdminService[];
    },
  });

  const patch = async (id: string, values: Partial<AdminService>) => {
    const { error } = await supabase.from("services").update(values).eq("id", id);
    onDone(error ? `❌ ${error.message}` : "✅ Service mis à jour");
    if (!error) await qc.invalidateQueries({ queryKey: ["admin-services"] });
  };

  const list = (services ?? []).filter((s) =>
    (s.name_fr + s.platform + s.category).toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <input
        className="bsm-input"
        placeholder="🔎 Rechercher un service…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {list.map((s) => (
        <div key={s.id} className="bsm-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {s.name_fr}{" "}
              <span className="text-xs text-muted-foreground">
                ({s.platform} • {s.category})
              </span>
            </p>
            <button
              onClick={() => void patch(s.id, { active: !s.active })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                s.active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {s.active ? "👁️ Visible" : "🙈 Masqué"}
            </button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <label className="text-xs text-muted-foreground">
              Prix (Ar)
              <input
                type="number"
                defaultValue={Number(s.price)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== Number(s.price)) void patch(s.id, { price: v });
                }}
                className="bsm-input mt-1"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Unité
              <input
                type="number"
                defaultValue={s.unit}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v !== s.unit) void patch(s.id, { unit: v });
                }}
                className="bsm-input mt-1"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Livraison estimée
              <input
                defaultValue={s.delivery_time}
                onBlur={(e) => {
                  if (e.target.value !== s.delivery_time)
                    void patch(s.id, { delivery_time: e.target.value });
                }}
                className="bsm-input mt-1"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Badge
              <select
                value={s.badge ?? ""}
                onChange={(e) => void patch(s.id, { badge: e.target.value })}
                className="bsm-input mt-1"
              >
                {BADGE_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-2 block text-xs text-muted-foreground">
            Note affichée
            <input
              defaultValue={s.note ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (s.note ?? "")) void patch(s.id, { note: e.target.value });
              }}
              className="bsm-input mt-1"
            />
          </label>
        </div>
      ))}
      {!list.length ? <p className="text-sm text-muted-foreground">Aucun service.</p> : null}
    </div>
  );
}
