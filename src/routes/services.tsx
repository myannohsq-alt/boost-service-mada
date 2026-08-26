import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Tarifs — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Tarifs Facebook, TikTok, Instagram et YouTube : réactions, followers, vues, commentaires et partages à petit prix en Ariary.",
      },
      { property: "og:title", content: "Services & Tarifs — BOOST SERVICE MADA" },
      { property: "og:description", content: "Tous nos services de boost réseaux sociaux en Ariary." },
    ],
  }),
  component: ServicesPage,
});

const platforms = [
  { id: "facebook", label: "📘 Facebook" },
  { id: "tiktok", label: "🎵 TikTok" },
  { id: "instagram", label: "📸 Instagram" },
  { id: "youtube", label: "▶️ YouTube" },
  { id: "protection", label: "🛡️ Protection" },
];

type Service = {
  id: string;
  platform: string;
  category: string;
  name_fr: string;
  name_mg: string;
  unit: number;
  price: number;
  note: string | null;
};

function ServicesPage() {
  const { lang } = useI18n();
  const { user, profile, refresh } = useAuth();
  const [platform, setPlatform] = useState("facebook");
  const [selected, setSelected] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [link, setLink] = useState("");
  const [promo, setPromo] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as Service[];
    },
  });

  const list = useMemo(
    () => (services ?? []).filter((s) => s.platform === platform),
    [services, platform],
  );

  const cost = selected ? Math.ceil((quantity / selected.unit) * Number(selected.price)) : 0;
  const balance = Number(profile?.balance ?? 0);
  const insufficient = cost > 0 && balance < cost;

  const submit = async () => {
    if (!selected) return;
    if (insufficient) {
      setMsg("⚠️ Solde insuffisant. Veuillez effectuer un dépôt ou une recharge avant de commander.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("place_order", {
      _service_id: selected.id,
      _quantity: quantity,
      _link: link,
      _promo: promo,
    });
    setBusy(false);
    if (error) {
      setMsg(`❌ ${error.message}`);
      return;
    }
    setMsg("✅ Commande envoyée ! Suivez-la dans « Mes commandes ».");
    setSelected(null);
    setLink("");
    setPromo("");
    await refresh();
  };


  return (
    <AuthGate>
    <Layout>
      <Section
        title="🛒 Services & Tarifs"
        subtitle="Prix en Ariary. Le solde est débité automatiquement à la commande."
      >
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`bsm-btn !py-1.5 !text-xs ${
                platform === p.id ? "bsm-btn-primary" : "bsm-btn-ghost"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {msg ? <p className="mt-4 rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {list.map((s) => (
            <div key={s.id} className="bsm-card p-4">
              <p className="text-[11px] uppercase tracking-wide text-primary">{s.category}</p>
              <p className="mt-1 font-semibold">{lang === "mg" ? s.name_mg : s.name_fr}</p>
              <p className="mt-1 text-sm text-gold">
                {s.unit} = {formatAr(Number(s.price))}
              </p>
              {s.note ? <p className="mt-1 text-xs text-muted-foreground">{s.note}</p> : null}
              <button
                onClick={() => {
                  setSelected(s);
                  setQuantity(s.unit);
                  setMsg(null);
                }}
                className="bsm-btn bsm-btn-primary mt-3 w-full !py-2 !text-xs"
              >
                🚀 Commander
              </button>
            </div>
          ))}
        </div>
      </Section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="bsm-card w-full max-w-md p-5">
            <h2 className="text-lg font-bold">{lang === "mg" ? selected.name_mg : selected.name_fr}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {selected.unit} = {formatAr(Number(selected.price))}
            </p>

            {!user ? (
              <div className="mt-4 text-sm">
                <p>Vous devez être connecté pour commander.</p>
                <Link to="/auth" className="bsm-btn bsm-btn-primary mt-3 w-full">
                  Se connecter
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Quantité</label>
                  <input
                    type="number"
                    min={selected.unit}
                    step={selected.unit}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="bsm-input mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Lien (URL publication / profil)</label>
                  <input
                    value={link}
                    maxLength={500}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="bsm-input mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Code promo (optionnel)</label>
                  <input
                    value={promo}
                    maxLength={20}
                    onChange={(e) => setPromo(e.target.value.toUpperCase())}
                    className="bsm-input mt-1"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary p-3 text-sm">
                  <span>Total</span>
                  <span className="font-bold text-gold">{formatAr(cost)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Solde : {formatAr(balance)}
                </p>
                {insufficient ? (
                  <div className="rounded-lg border border-gold/40 bg-secondary p-3 text-xs">
                    <p className="font-semibold text-gold">
                      ⚠️ Solde insuffisant. Veuillez effectuer un dépôt ou une recharge avant de
                      commander.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/depot" className="bsm-btn bsm-btn-primary !py-2 !text-xs">
                        💳 Faire un dépôt
                      </Link>
                      <Link to="/recharge" className="bsm-btn bsm-btn-gold !py-2 !text-xs">
                        ⚡ Recharger
                      </Link>
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <button
                    disabled={busy || !link.trim() || insufficient}
                    onClick={submit}
                    className="bsm-btn bsm-btn-primary flex-1 disabled:opacity-50"
                  >
                    {busy ? "..." : insufficient ? "🔒 Solde insuffisant" : "✅ Confirmer"}
                  </button>

                  <button onClick={() => setSelected(null)} className="bsm-btn bsm-btn-ghost">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Layout>
    </AuthGate>
  );
}
