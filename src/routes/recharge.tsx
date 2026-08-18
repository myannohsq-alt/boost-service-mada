import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout, Section } from "@/components/Layout";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recharge")({
  head: () => ({
    meta: [
      { title: "Recharge de solde — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Rechargez votre solde : envoyez l'argent au numéro Mobile Money puis validez avec la référence de transaction.",
      },
      { property: "og:title", content: "Recharge — BOOST SERVICE MADA" },
      { property: "og:description", content: "Créditez votre compte en quelques secondes." },
    ],
  }),
  component: RechargePage,
});

export const NUMBERS = [
  { phone: "0375141025", owner: "ROLINE" },
  { phone: "0330296908", owner: "MARODOLINX" },
  { phone: "0386100374", owner: "THÉODORE" },
];

function RechargePage() {
  const { user } = useAuth();
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null);
    const value = Number(amount);
    if (sender.replace(/\D/g, "").length < 9) return setMsg("❌ Numéro d'envoi invalide.");
    if (reference.trim().length < 3) return setMsg("❌ Référence transaction obligatoire.");
    if (!Number.isFinite(value) || value < 1000) return setMsg("❌ Dépôt minimum : 1 000 Ar.");
    setBusy(true);
    const { error } = await supabase.from("recharges").insert({
      user_id: user!.id,
      sender_phone: sender.replace(/\D/g, ""),
      reference: reference.trim(),
      amount: value,
    });
    setBusy(false);
    if (error) return setMsg(`❌ ${error.message}`);
    setMsg("✅ Recharge envoyée ! Elle sera validée par l'administrateur.");
    setSender("");
    setReference("");
    setAmount("");
  };

  return (
    <Layout>
      <Section title="💰 Recharge" subtitle="Dépôt minimum : 1 000 Ar.">
        <div className="grid gap-3 sm:grid-cols-3">
          {NUMBERS.map((n) => (
            <div key={n.phone} className="bsm-card p-4 text-center">
              <p className="font-display text-lg font-bold text-primary">{n.phone}</p>
              <p className="text-xs text-muted-foreground">{n.owner}</p>
            </div>
          ))}
        </div>

        {!user ? (
          <div className="bsm-card mt-5 p-5 text-sm">
            <p>Connectez-vous pour valider une recharge.</p>
            <Link to="/auth" className="bsm-btn bsm-btn-primary mt-3">
              Se connecter
            </Link>
          </div>
        ) : (
          <div className="bsm-card mt-5 space-y-3 p-5">
            <div>
              <label className="text-xs text-muted-foreground">📱 Numéro ayant envoyé l'argent</label>
              <input
                value={sender}
                maxLength={20}
                inputMode="tel"
                onChange={(e) => setSender(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">🔢 Référence transaction</label>
              <input
                value={reference}
                maxLength={40}
                onChange={(e) => setReference(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">💵 Montant envoyé (Ar)</label>
              <input
                value={amount}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => setAmount(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
            {msg ? <p className="rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}
            <button
              disabled={busy}
              onClick={submit}
              className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
            >
              {busy ? "..." : "✅ Valider la recharge"}
            </button>
            <p className="text-xs text-muted-foreground">
              ⚠️ Toute fausse information peut entraîner le refus de validation.
            </p>
          </div>
        )}
      </Section>
    </Layout>
  );
}
