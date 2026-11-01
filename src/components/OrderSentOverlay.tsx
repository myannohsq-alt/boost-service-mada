import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Detail = { label: string; balance: string };
const EVENT = "bsm:order-sent";

export function showOrderSent(label: string, balance: string) {
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { label, balance } }));
}

/** Full-screen confirmation shown after a successful order; closes itself. */
export function OrderSentOverlay() {
  const [d, setD] = useState<Detail | null>(null);
  useEffect(() => {
    let t: number | undefined;
    const on = (e: Event) => {
      setD((e as CustomEvent<Detail>).detail);
      window.clearTimeout(t);
      t = window.setTimeout(() => setD(null), 3200);
    };
    window.addEventListener(EVENT, on);
    return () => { window.removeEventListener(EVENT, on); window.clearTimeout(t); };
  }, []);
  if (!d || typeof document === "undefined") return null;
  return createPortal(
    <div role="status" aria-live="assertive" onClick={() => setD(null)}
      style={{ pointerEvents: "auto" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-primary/50 bg-card p-6 text-center shadow-[0_0_40px_var(--primary)] animate-in zoom-in-50 duration-300">
        <div className="relative mx-auto mb-4 h-20 w-20">
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-gold text-4xl font-black text-primary-foreground shadow-lg">✓</div>
        </div>
        <p className="font-display text-lg font-extrabold text-foreground">Votre demande a été envoyée</p>
        <p className="mt-1 text-sm text-muted-foreground">{d.label}</p>
        <p className="mt-3 text-xs text-muted-foreground">Nouveau solde : <span className="font-bold text-primary">{d.balance}</span></p>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-to-r from-primary to-gold" style={{ animation: "bsm-shrink 3.2s linear forwards" }} />
        </div>
        <style>{"@keyframes bsm-shrink{from{width:100%}to{width:0%}}"}</style>
      </div>
    </div>,
    document.body,
  );
}
