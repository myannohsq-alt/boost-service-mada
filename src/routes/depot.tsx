import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Dépôt Mobile Money — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Rechargez votre solde par Orange Money, MVola ou Airtel Money. Dépôt minimum 1 000 Ar, validation rapide par l'administrateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Dépôt Mobile Money — BOOST SERVICE MADA" },
      {
        property: "og:description",
        content: "Orange Money, MVola et Airtel Money. Dépôt minimum 1 000 Ar.",
      },
    ],
  }),
  component: DepotPage,
});

export type Operator = {
  id: "orange" | "mvola" | "airtel";
  label: string;
  emoji: string;
  phone: string;
  owner: string;
  ussd: string;
};

export const OPERATORS: Operator[] = [
  {
    id: "orange",
    label: "Orange Money",
    emoji: "🟠",
    phone: "0386100374",
    owner: "THÉODORE",
    ussd: "#144#",
  },
  { id: "mvola", label: "MVola", emoji: "🟢", phone: "0375141025", owner: "ROLINE", ussd: "#111#" },
  {
    id: "airtel",
    label: "Airtel Money",
    emoji: "🔴",
    phone: "0330296908",
    owner: "MARODOLINX",
    ussd: "#436#",
  },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ En attente",
  approved: "✅ Crédité",
  rejected: "❌ Refusé",
};

function DepotPage() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [op, setOp] = useState<Operator["id"]>("orange");
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const active = OPERATORS.find((o) => o.id === op)!;

  const { data: history } = useQuery({
    queryKey: ["my-recharges", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("recharges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("📋 Numéro copié");
    } catch {
      toast.error("Copie impossible, notez le numéro manuellement.");
    }
  };

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1000) return toast.error("❌ Dépôt minimum : 1 000 Ar.");
    if (sender.replace(/\D/g, "").length < 9) return toast.error("❌ Numéro d'envoi invalide.");
    if (reference.trim().length < 3) return toast.error("❌ Référence transaction obligatoire.");

    setBusy(true);
    const { error } = await supabase.from("recharges").insert({
      user_id: user!.id,
      sender_phone: sender.replace(/\D/g, ""),
      reference: reference.trim(),
      amount: value,
      method: active.id,
    });
    setBusy(false);

    if (error) {
      const dup = error.message.toLowerCase().includes("duplicate") || error.code === "23505";
      toast.error(dup ? "⚠️ Cette référence a déjà été utilisée." : `❌ ${error.message}`);
      return;
    }
    toast.success("✅ Demande envoyée ! Votre solde sera crédité après validation.");
    setAmount("");
    setSender("");
    setReference("");
    await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["my-recharges"] })]);
  };

  return (
    <AuthGate>
      <Layout>
        <Section
          title="💳 Dépôt Mobile Money"
          subtitle="Choisissez votre opérateur, envoyez l'argent, puis validez la demande. Dépôt minimum : 1 000 Ar."
        >
          <div className="bsm-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">Solde actuel</p>
            <p className="font-display text-2xl font-extrabold text-primary">
              {formatAr(profile?.balance ?? 0)}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {OPERATORS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOp(o.id)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-all active:scale-95 ${
                  op === o.id
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_26px_-8px_var(--color-primary)]"
                    : "border-border bg-card/70 text-foreground hover:border-primary/50"
                }`}
              >
                {o.emoji} {o.label}
              </button>
            ))}
          </div>

          <div className="bsm-card mt-4 border-primary/50 p-5 text-center shadow-[0_0_36px_-14px_var(--color-primary)]">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {active.emoji} {active.label}
            </p>
            <p className="mt-2 font-display text-3xl font-extrabold text-primary">{active.phone}</p>
            <p className="mt-1 text-sm text-gold">{active.owner}</p>
            <p className="mt-1 text-xs text-muted-foreground">Composez {active.ussd} pour envoyer</p>
            <button onClick={() => void copy(active.phone)} className="bsm-btn bsm-btn-gold mt-4">
              📋 Copier le numéro
            </button>
          </div>

          <div className="bsm-card mt-5 p-5 text-sm">
            <h2 className="font-semibold">👇 Fomba famenoana (Étapes)</h2>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Alefaso ny vola amin'ny numéro {active.phone} ({active.label}).</li>
              <li>Raiso ny <strong>référence transaction</strong> ao amin'ny SMS.</li>
              <li>Fenoy ny formulaire etsy ambany (montant, numéro, référence).</li>
              <li>Miandry validation : ho tonga avy hatrany ny solde-nao.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              ⚠️ Référence efa nampiasaina dia lavina automatique. Toute fausse information peut
              entraîner le refus.
            </p>
          </div>

          <div className="bsm-card mt-5 space-y-3 p-5">
            <h2 className="font-semibold">📝 Demande de dépôt</h2>
            <div>
              <label className="text-xs text-muted-foreground">💵 Montant envoyé (Ar)</label>
              <input
                value={amount}
                inputMode="numeric"
                maxLength={9}
                placeholder="1000"
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="bsm-input mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">📱 Numéro ayant envoyé l'argent</label>
              <input
                value={sender}
                inputMode="tel"
                maxLength={20}
                placeholder="03X XX XXX XX"
                onChange={(e) => setSender(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">🔢 Référence transaction</label>
              <input
                value={reference}
                maxLength={40}
                placeholder="Ex : 1234567890"
                onChange={(e) => setReference(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
            <button
              disabled={busy}
              onClick={() => void submit()}
              className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Envoi…" : "✅ Envoyer la demande"}
            </button>
          </div>

          <div className="mt-6">
            <h2 className="font-semibold">📜 Historique des dépôts</h2>
            <div className="mt-3 space-y-2">
              {(history ?? []).map((r) => {
                const o = OPERATORS.find((x) => x.id === r.method);
                return (
                  <div key={r.id} className="bsm-card flex flex-wrap items-center gap-2 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gold">{formatAr(Number(r.amount))}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o ? `${o.emoji} ${o.label}` : r.method || "Mobile Money"} • Réf : {r.reference}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                );
              })}
              {!history?.length ? (
                <p className="text-sm text-muted-foreground">Aucun dépôt pour le moment.</p>
              ) : null}
            </div>
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}
