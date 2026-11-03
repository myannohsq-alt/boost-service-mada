import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { verifyDepot } from "@/lib/depots.functions";
import { depotsClient } from "@/lib/external-depots";
import { formatAr } from "@/lib/i18n";

export function VerifyDepot({ phone, montant, onCredited }: { phone: string; montant: number; onCredited: () => void }) {
  const verify = useServerFn(verifyDepot);
  const [state, setState] = useState<"idle" | "waiting" | "ok">("idle");
  const [credited, setCredited] = useState(0);
  const busy = useRef(false);

  const check = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await verify({ data: { phone, montant } });
      if (r.found) {
        setCredited(r.montant + r.bonus);
        setState("ok");
        toast.success(`Dépôt confirmé ${formatAr(r.montant)} ✅`);
        onCredited();
      }
    } catch {
      /* retry next tick */
    } finally {
      busy.current = false;
    }
  };

  // Poll every 5s + realtime INSERT while waiting.
  useEffect(() => {
    if (state !== "waiting") return;
    const t = window.setInterval(check, 5000);
    const sb = depotsClient();
    const ch = sb
      .channel(`depots-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "Depots" }, (payload) => {
        const n = payload.new as Record<string, unknown>;
        const msg = String(n["message"] ?? n["Message"] ?? "").replace(/\D/g, "");
        if (msg.includes(phone.replace(/\D/g, "").slice(-9))) void check();
      })
      .subscribe();
    return () => {
      window.clearInterval(t);
      void sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, phone, montant]);

  const valid = phone.replace(/\D/g, "").length >= 9 && montant >= 1000;

  if (state === "ok")
    return <p className="bsm-card mt-3 p-3 text-center font-bold text-primary">Dépôt confirmé {formatAr(credited)} ✅</p>;

  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={!valid}
        onClick={() => { setState("waiting"); void check(); }}
        className="bsm-btn w-full disabled:opacity-50"
      >
        🔎 Vérifier mon dépôt
      </button>
      {state === "waiting" ? (
        <p className="mt-2 animate-pulse text-center text-sm text-muted-foreground">⏳ En attente... (vérification toutes les 5 s)</p>
      ) : null}
    </div>
  );
}
