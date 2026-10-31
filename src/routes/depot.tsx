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
import { useDepositPauses } from "@/components/DepositPauseAdmin";

const MIN_DEPOSIT = 1000;
const MAX_DEPOSIT = 2_000_000;
/** Official service numbers (last 9 digits) — clients must enter their own sender number. */
const SERVICE_NUMBERS = ["346546600", "330296908", "375141025"];
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

function ussdFor(id: Operator["id"], n: number) {
  if (id === "mvola") return `#111*1*2*0346546600*${n}*2*2#`;
  if (id === "orange") return `#144*11*0375141025*0375141025*${n}*2#`;
  return `*436*2*1*1*0330296908*${n}*2#`;
}

function DepotPage() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const [op, setOp] = useState<Operator["id"]>("mvola");
  const [amount, setAmount] = useState("");
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [called, setCalled] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const active = OPERATORS.find((o) => o.id === op) ?? OPERATORS[0]!;
  const { data: pauses } = useDepositPauses();
  const pausedUntil = pauses?.[active.id] ?? null;

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
    if (!Number.isFinite(value) || value < MIN_DEPOSIT || value > MAX_DEPOSIT) {
      toast.error("❌ Montant entre 1 000 et 2 000 000 Ar.");
      return;
    }
    const digits = sender.replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("❌ Numéro d'envoi invalide.");
      return;
    }
    if (SERVICE_NUMBERS.includes(digits.slice(-9))) {
      toast.error("Numéro nandefa le vola no apetraka eo azafady 🙏");
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
      toast.error(dup ? "⚠️ Cette référence a déjà été utilisée." : `❌ ${error.message}`, { duration: 6000 });
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
          <div className="mt-4 grid grid-cols-3 gap-2">
            {OPERATORS.map((o) => {
              const on = o.id === active.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => selectOperator(o.id)}
                  aria-pressed={on}
                  style={{ "--op": o.accent } as CSSProperties}
                  className={`bsm-op-tile ${on ? "bsm-op-tile-active" : ""} !flex-col !gap-1 !p-2 text-center active:scale-[0.98]`}
                >
                  <span className="bsm-op-mark">{o.mark}</span>
                  <span className="block truncate text-[11px] font-bold">{o.label}</span>
                </button>
              );
            })}
          </div>

          {/* --- Carte de paiement de l'opérateur --- */}
          <div key={active.id} style={accent} className="bsm-op-card mt-4 p-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <span
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border-2 font-display text-3xl font-black leading-none"
                style={{ borderColor: "var(--op)", color: "var(--op)", background: "color-mix(in oklab, var(--op) 15%, transparent)" }}
              >
                {active.mark}
                <span className="mt-1 text-[9px] font-bold tracking-wider">{active.badge}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Numéro bénéficiaire</p>
                <button
                  type="button"
                  onClick={() => void copy(active)}
                  className="block font-display text-xl font-extrabold text-foreground"
                  title="Copier le numéro"
                >
                  {active.phone} <span className="text-xs">{copied ? "✅" : "📋"}</span>
                </button>
                <p className="truncate text-sm font-extrabold uppercase text-gold">👤 {active.owner}</p>
              </div>
            </div>
            {(() => {
              const n = Math.floor(Number(amount));
              const ok = n >= MIN_DEPOSIT && n <= 2_000_000;
              const code = ok ? ussdFor(active.id, n) : null;
              return (
                <div className="mt-4 border-t border-border pt-4 text-left">
                  <label className="text-sm font-semibold text-foreground">
                    🪙 Montant à déposer (Ar)
                  </label>
                  <div className="relative mt-2">
                    <input
                      value={amount}
                      inputMode="numeric"
                      maxLength={7}
                      placeholder="5000"
                      onChange={(e) => {
                        setAmount(e.target.value.replace(/\D/g, ""));
                        setCalled(false);
                      }}
                      className="bsm-input !rounded-xl !py-3 pr-16 font-display text-2xl font-bold"
                    />
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1 text-sm font-bold"
                      style={{ background: "color-mix(in oklab, var(--op) 25%, transparent)", color: "var(--op)" }}
                    >
                      Ar
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold">
                    <span className="text-muted-foreground">Minimum : 1 000 Ar</span>
                    <span className="text-muted-foreground"> | </span>
                    <span className="text-gold">Maximum : 2 000 000 Ar</span>
                  </p>
                  <a
                    href={code ? `tel:${code.replace(/#/g, "%23")}` : undefined}
                    aria-disabled={!code}
                    onClick={() => code && setCalled(true)}
                    className={`bsm-btn bsm-btn-gold mt-4 block w-full text-center text-base ${code ? "" : "pointer-events-none opacity-50"}`}
                  >
                    📞 Appeler pour envoyer
                  </a>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {code
                      ? `Le code sera préparé pour lancer l'appel ${active.label}.`
                      : "Ampidiro ny montant (1 000 – 2 000 000 Ar)."}
                  </p>
                  {called && code && (
                    <div className="mt-3 rounded-xl border border-border p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Tsy nety ve ny antso ? Adikao ity kaody ity :
                      </p>
                      <p className="mt-1 break-all font-display text-sm font-bold text-foreground">
                        {code}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(code);
                          toast.success("Kaody voadika !");
                        }}
                        className="bsm-btn mt-2 w-full"
                      >
                        📋 Copier le code
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>


          {/* --- Formulaire --- */}
          {(() => {
            const n = Number(amount);
            const amountOk = n >= MIN_DEPOSIT && n <= MAX_DEPOSIT;
            const senderDigits = sender.replace(/\D/g, "").slice(-9);
            const isServiceNo = SERVICE_NUMBERS.includes(senderDigits);
            const senderOk = senderDigits.length === 9 && !isServiceNo;
            const refOk = reference.trim().length >= 3;
            const can = amountOk && senderOk && refOk && !busy && !pausedUntil;
            const box = "rounded-xl border border-neon/30 bg-background/60 p-2.5";
            const field =
              "w-full rounded-xl border border-neon/40 bg-secondary/60 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-neon focus:shadow-[0_0_10px_var(--color-neon)]";
            return (
              <div className="mt-4 space-y-2 rounded-2xl border border-neon/70 bg-card p-3 shadow-[0_0_18px_color-mix(in_oklab,var(--color-neon)_45%,transparent)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neon/20 text-base">💳</span>
                  <div>
                    <h2 className="font-display text-base font-extrabold leading-tight">
                      Demande de <span className="text-gold">dépôt</span>
                    </h2>
                    <p className="text-[11px] text-primary">
                      Remplissez les informations ci-dessous
                    </p>
                  </div>
                </div>

                <div className={box}>
                  <label className="flex items-center gap-2 text-xs font-bold">🪙 Montant à déposer (Ar)</label>
                  <div className="relative mt-1.5">
                    <input
                      value={amount}
                      inputMode="numeric"
                      maxLength={7}
                      placeholder="Ex : 1000"
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      className={`${field} pr-14 font-display text-base font-bold`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-neon px-2 py-0.5 text-xs font-bold text-background">Ar</span>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold">
                    Minimum : <span className="text-gold">1 000 Ar</span> | Maximum : <span className="text-gold">2 000 000 Ar</span>
                  </p>
                  <div className="mt-1.5 grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setAmount(String(q))}
                        className={`rounded-full border py-1 text-xs font-bold ${
                          amount === String(q) ? "border-gold bg-gold/15 text-gold" : "border-neon/60 text-foreground"
                        }`}
                      >
                        {q.toLocaleString("fr-FR")}
                      </button>
                    ))}
                  </div>
                  {amount && !amountOk ? (
                    <p className="mt-1 text-xs font-semibold text-destructive">Montant entre 1 000 et 2 000 000 Ar.</p>
                  ) : null}
                </div>

                <div className={box}>
                  <label className="text-xs font-bold">📞 Numéro ayant envoyé l'argent</label>
                  <input
                    value={sender}
                    inputMode="tel"
                    maxLength={20}
                    placeholder="Ex : 034 12 345 67"
                    onChange={(e) => setSender(e.target.value)}
                    className={`${field} mt-1.5 ${isServiceNo ? "!border-destructive" : ""}`}
                  />
                  {isServiceNo ? (
                    <p className="mt-1 text-[11px] font-bold text-destructive">
                      ⚠️ Numéro nandefa le vola no apetraka eo azafady 🙏
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-primary">
                      ℹ️ Saisissez le numéro qui a envoyé l'argent, et non le numéro du service.
                    </p>
                  )}
                </div>

                <div className={box}>
                  <label className="text-xs font-bold">📋 Référence de transaction</label>
                  <input
                    value={reference}
                    maxLength={40}
                    placeholder="Ex : 1234567890"
                    onChange={(e) => setReference(e.target.value)}
                    className={`${field} mt-1.5`}
                  />
                  <p className="mt-1 text-[11px] text-primary">
                    ℹ️ Copiez la référence figurant dans le SMS de confirmation de votre transfert.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!can}
                  onClick={() => void submit()}
                  className="w-full rounded-full bg-gold py-2.5 text-sm font-extrabold text-background disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pausedUntil ? `⏸️ ${active.name ?? ""} suspendu jusqu'à ${pausedUntil.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : busy ? "Envoi…" : "✅ Envoyer la demande"}
                </button>
                <p className="text-center text-[10px] text-muted-foreground">🛡️ Votre demande sera vérifiée avant validation.</p>
              </div>
            );
          })()}

          {/* --- Étapes MG + FR --- */}
          <div className="bsm-card mt-5 p-4">
            <h2 className="font-semibold">💡 Fomba famenoana / Comment déposer</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                {
                  flag: "🇲🇬 Malagasy",
                  cls: "text-gold",
                  steps: [
                    <>Alefaso {active.label} amin'ny <strong className="text-foreground">{active.phone}</strong></>,
                    <>Tehirizo ny <strong className="text-foreground">référence</strong></>,
                    <>Fenoy ny formulaire etsy ambony</>,
                    <>Andraso 2-5 min fanamafisana</>,
                  ],
                },
                {
                  flag: "🇫🇷 Français",
                  cls: "text-primary",
                  steps: [
                    <>Envoyez {active.label} au <strong className="text-foreground">{active.phone}</strong></>,
                    <>Notez la <strong className="text-foreground">référence</strong></>,
                    <>Remplissez le formulaire ci-dessus</>,
                    <>Attente 2-5 min validation</>,
                  ],
                },
              ].map((col) => (
                <div key={col.flag} className="rounded-xl bg-secondary/60 p-3">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${col.cls}`}>{col.flag}</p>
                  <ol className="mt-2 space-y-2 text-xs text-muted-foreground">
                    {col.steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-foreground">
                          {i + 1}
                        </span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs text-gold">
              ⚠️ <strong>Attention :</strong> Référence efa nampiasaina dia lavina automatique.
              Vérifiez bien avant d'envoyer. Une référence = une seule transaction.
            </p>
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
