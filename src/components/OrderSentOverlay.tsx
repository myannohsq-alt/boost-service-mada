import { useEffect, useState } from "react";

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
      t = window.setTimeout(() => setD(null), 2600);
    };
    window.addEventListener(EVENT, on);
    return () => { window.removeEventListener(EVENT, on); window.clearTimeout(t); };
  }, []);
  if (!d) return null;
  return (
    <div role="status" onClick={() => setD(null)}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bsm-card w-full max-w-xs p-6 text-center shadow-2xl animate-in zoom-in-75 duration-300">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-3xl text-primary-foreground animate-bounce">✓</div>
        <p className="font-display text-lg font-extrabold">Votre demande a été envoyée</p>
        <p className="mt-1 text-sm text-muted-foreground">{d.label}</p>
        <p className="mt-3 text-xs text-muted-foreground">Nouveau solde : <span className="font-bold text-primary">{d.balance}</span></p>
      </div>
    </div>
  );
}
