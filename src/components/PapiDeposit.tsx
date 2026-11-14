import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createPapiPayment, checkPapiPayment } from "@/lib/papi.functions";
import { OPERATORS } from "@/lib/payment-operators";
import { formatAr } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";

type State = "idle" | "pending" | "success" | "failed";

export function PapiDeposit() {
  const { refresh } = useAuth();
  const create = useServerFn(createPapiPayment);
  const check = useServerFn(checkPapiPayment);
  const [method, setMethod] = useState<"mvola" | "orange" | "airtel">("mvola");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [ref, setRef] = useState<string | null>(null);

  // Returning from Papi: ?papi=<reference>
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("papi");
    if (r) { setRef(r); setState("pending"); }
  }, []);

  useEffect(() => {
    if (!ref || state !== "pending") return;
    let n = 0;
    const tick = async () => {
      try {
        const out = await check({ data: { reference: ref } });
        if (out.state === "success") { setState("success"); toast.success("Dépôt réussi ✅ Solde crédité"); refresh?.(); }
        else if (out.state === "failed") { setState("failed"); toast.error("Paiement échoué ❌"); }
      } catch { /* retry */ }
    };
    tick();
    const id = window.setInterval(() => { if (++n > 60) window.clearInterval(id); else tick(); }, 5000);
    return () => window.clearInterval(id);
  }, [ref, state, check, refresh]);

  const n = Number(amount);
  const submit = async () => {
    if (!Number.isInteger(n) || n < 1000 || n > 2_000_000) { toast.error("Montant entre 1 000 et 2 000 000 Ar"); return; }
    setBusy(true);
    try {
      const out = await create({ data: { amount: n, method, origin: window.location.origin } });
      window.location.href = out.paymentLink;
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="bsm-card mt-4 p-4">
      <p className="font-display text-base font-extrabold">⚡ Dépôt automatique instantané</p>
      <p className="mt-1 text-xs text-muted-foreground">Payez via Papi, votre solde est crédité dès la confirmation.</p>
      {state !== "idle" && (
        <p className="mt-3 rounded-lg border border-border p-2 text-sm font-semibold">
          {state === "pending" && "⏳ En attente de confirmation…"}
          {state === "success" && "✅ Réussi — solde crédité"}
          {state === "failed" && "❌ Échoué — réessayez ou utilisez le dépôt manuel"}
        </p>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPERATORS.map((o) => (
          <button key={o.id} type="button" onClick={() => setMethod(o.id)}
            className={`rounded-lg border p-2 text-xs font-bold ${method === o.id ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            {o.emoji} {o.label}
          </button>
        ))}
      </div>
      <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
        placeholder="Montant (min 1 000 Ar)" className="mt-3 w-full rounded-lg border border-border bg-background p-2 text-sm" />
      <button type="button" disabled={busy} onClick={submit}
        className="mt-3 w-full rounded-lg bg-primary p-2.5 text-sm font-extrabold text-primary-foreground disabled:opacity-60">
        {busy ? "Redirection…" : `Payer ${n >= 1000 ? formatAr(n) : ""} maintenant`}
      </button>
    </div>
  );
}
