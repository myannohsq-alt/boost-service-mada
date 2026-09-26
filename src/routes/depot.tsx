import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { OPERATORS, operatorById, type Operator } from "@/lib/payment-operators";
import { supabase } from "@/integrations/supabase/client";

const MIN_DEPOSIT = 1000;
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];

export const Route = createFileRoute("/depot")({
  head: () => ({
    meta: [
      { title: "Dépôt Mobile Money — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Rechargez votre solde par MVola, Orange Money ou Airtel Money. Dépôt minimum 1 000 Ar, validation rapide par l'administrateur.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Dépôt Mobile Money — BOOST SERVICE MADA" },
      {
        property: "og:description",
        content:
          "MVola 034 65 466 00, Orange Money 037 51 410 25, Airtel Money 033 02 969 08. Dépôt minimum 1 000 Ar.",
      },
    ],
  }),
  component: DepotPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ En attente",
  approved: "✅ Crédité",
  rejected: "❌ Refusé",
};

function DepotPage() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [op, setOp] = useState<Operator["id"]>("mvola");
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const active = OPERATORS.find((o) => o.id === op) ?? OPERATORS[0];

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

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

  const selectOperator = (id: Operator["id"]) => {
    setOp(id);
    setCopied(false);
  };

  const copy = async (o: Operator) => {
    try {
      await navigator.clipboard.writeText(o.dial);
      setCopied(true);
      toast.success(`📋 Numéro ${o.label} copié`);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copie impossible, notez le numéro manuellement.");
    }
  };

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_DEPOSIT) {
      toast.error(`❌ Dépôt minimum : ${formatAr(MIN_DEPOSIT)}.`);
      return;
    }
    if (sender.replace(/\D/g, "").length < 9) {
      toast.error("❌ Numéro d'envoi invalide.");
      return;
    }
    if (reference.trim().length < 3) {
      toast.error("❌ Référence transaction obligatoire.");
      return;
    }

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

  const accent = { "--op": active.accent } as CSSProperties;

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

          {/* --- Choix de l'opérateur --- */}
          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {OPERATORS.map((o) => {
              const on = o.id === active.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOperator(o.id)}
                  aria-pressed={on}
                  style={{ "--op": o.accent } as CSSProperties}
                  className={`bsm-op-tile ${on ? "bsm-op-tile-active" : ""} active:scale-[0.98]`}
                >
                  <span className="bsm-op-mark">{o.mark}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{o.label}</span>
                    <span
                      className="block truncate text-[11px] font-semibold tracking-wide"
                      style={{ color: on ? "var(--op)" : "var(--color-muted-foreground)" }}
                    >
                      {on ? "● Sélectionné" : o.ussd}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* --- Carte de paiement de l'opérateur --- */}
          <div key={active.id} style={accent} className="bsm-op-card mt-4 p-5 text-center">
            <span className="bsm-op-badge">
              {active.emoji} {active.badge}
            </span>
            <p className="bsm-op-number mt-4">{active.phone}</p>
            <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.22em] text-gold">
              {active.owner}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Composez{" "}
              <span className="font-display font-bold text-foreground">{active.ussd}</span> pour
              envoyer
            </p>
            <button
              type="button"
              onClick={() => void copy(active)}
              className="bsm-btn bsm-btn-gold mt-4 w-full sm:w-auto"
            >
              {copied ? "✅ Copié !" : "📋 Copier le numéro"}
            </button>
          </div>

          {/* --- Étapes MG + FR --- */}
          <div className="bsm-card mt-5 p-5">
            <h2 className="font-semibold">
              📝 Fomba famenoana <span className="text-muted-foreground">· Comment déposer</span>
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gold">
                  🇲🇬 Malagasy
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>
                    Alefaso ny vola amin'ny{" "}
                    <strong className="text-foreground">{active.phone}</strong> ({active.label}).
                  </li>
                  <li>
                    Raiso ny <strong className="text-foreground">référence</strong> ao amin'ny SMS.
                  </li>
                  <li>Fenoy ny formulaire : montant, numéro, référence.</li>
                  <li>Miandry validation : ho tonga avy hatrany ny solde-nao.</li>
                </ol>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                  🇫🇷 Français
                </p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>
                    Envoyez le montant au{" "}
                    <strong className="text-foreground">{active.phone}</strong> ({active.label}).
                  </li>
                  <li>
                    Notez la <strong className="text-foreground">référence</strong> reçue par SMS.
                  </li>
                  <li>Remplissez le formulaire : montant, numéro, référence.</li>
                  <li>Attendez la validation : le solde est crédité rapidement.</li>
                </ol>
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-secondary/70 p-3 text-xs text-muted-foreground">
              ⚠️ Référence efa nampiasaina dia lavina automatique. Toute fausse information peut
              entraîner le refus.
            </p>
          </div>

          {/* --- Formulaire --- */}
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
                className="bsm-input mt-1 !rounded-xl"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      amount === String(q)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-secondary/60 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {q.toLocaleString("fr-FR")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                📱 Numéro ayant envoyé l'argent
              </label>
              <input
                value={sender}
                inputMode="tel"
                maxLength={20}
                placeholder="03X XX XXX XX"
                onChange={(e) => setSender(e.target.value)}
                className="bsm-input mt-1 !rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">🔢 Référence transaction</label>
              <input
                value={reference}
                maxLength={40}
                placeholder="Ex : 1234567890"
                onChange={(e) => setReference(e.target.value)}
                className="bsm-input mt-1 !rounded-xl"
              />
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "Envoi…" : "✅ Envoyer la demande"}
            </button>
          </div>

          {/* --- Historique --- */}
          <div className="mt-6">
            <h2 className="font-semibold">📜 Historique des dépôts</h2>
            <div className="mt-3 space-y-2">
              {(history ?? []).map((r) => {
                const o = operatorById(r.method);
                return (
                  <div
                    key={r.id}
                    className="bsm-card flex flex-wrap items-center gap-2 p-4"
                    style={o ? ({ "--op": o.accent } as CSSProperties) : undefined}
                  >
                    {o ? <span className="bsm-op-mark !h-9 !w-9 text-sm">{o.mark}</span> : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gold">{formatAr(Number(r.amount))}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o ? `${o.emoji} ${o.label} • ${o.phone}` : "Mobile Money"} • Réf :{" "}
                        {r.reference}
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
