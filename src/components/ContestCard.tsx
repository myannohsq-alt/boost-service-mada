import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useCountdown(to: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  if (!to) return "";
  const ms = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return `${d}j ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ContestCard() {
  const { data: c } = useQuery({
    queryKey: ["contest"],
    queryFn: async () => ((await supabase.rpc("current_contest")).data ?? [])[0] ?? null,
    refetchInterval: 60_000,
  });
  const { data: board } = useQuery({
    queryKey: ["contest-board"],
    queryFn: async () => (await supabase.rpc("contest_board", { _limit: 10 })).data ?? [],
    refetchInterval: 60_000,
    enabled: !!c,
  });
  const left = useCountdown(c?.ends_at);
  if (!c) return null;
  return (
    <div className="space-y-2 rounded-2xl border border-primary/40 bg-card p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">🏆 {c.title} — {c.prize.toLocaleString("fr-FR")} Ar</h3>
        {!c.settled && <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">{left}</span>}
      </div>
      {c.settled ? (
        <p className="text-xs">{c.winner_name ? <>🎉 Mpandresy : <b>{c.winner_name}</b> ({c.winner_invites} namana)</> : "Tsy nisy nahatratra ny fepetra."}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Asao namana {c.min_invites} farafahakeliny mba ho tafiditra. Izay manasa betsaka indrindra no mahazo {c.prize} Ar (retrait mobile money).</p>
      )}
      <ol className="space-y-1">
        {(board ?? []).map((r, i) => (
          <li key={i} className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${r.is_me ? "bg-primary/15" : "bg-secondary/50"}`}>
            <span>{i + 1}. {r.author_name}{r.is_me ? " (ianao)" : ""}</span>
            <span className="font-bold">{r.invites} {r.eligible ? "✅" : ""}</span>
          </li>
        ))}
        {board && board.length === 0 && <li className="text-center text-[11px] text-muted-foreground">Mbola tsy misy — ianao no voalohany!</li>}
      </ol>
    </div>
  );
}
