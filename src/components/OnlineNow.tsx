import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";

/** Real-time count of members currently connected (presence). Never inflated. */
export function OnlineNow() {
  const { user } = useAuth();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const key = user?.id ?? `guest-${Math.random().toString(36).slice(2)}`;
    const ch = supabase.channel("online-users", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => setN(Object.keys(ch.presenceState()).length))
      .subscribe((s) => { if (s === "SUBSCRIBED") void ch.track({ at: Date.now() }); });
    return () => { void supabase.removeChannel(ch); };
  }, [user?.id]);
  if (n === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {n.toLocaleString("fr-FR")} en ligne
    </span>
  );
}
