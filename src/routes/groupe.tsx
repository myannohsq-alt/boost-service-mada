import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/groupe")({
  head: () => ({
    meta: [
      { title: "Groupe MADA — Chat BOOST SERVICE MADA" },
      { name: "description", content: "Chat communautaire en temps réel des membres BOOST SERVICE MADA — 1 Ar par message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Groupe MADA — Chat BOOST SERVICE MADA" },
      { property: "og:description", content: "Discutez en direct avec la communauté, 1 Ar par message." },
    ],
  }),
  component: GroupPage,
});

type ChatMsg = { id: string; user_id: string; author_name: string; content: string; created_at: string };

function GroupPage() {
  const { user, profile, isAdmin, refresh } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [bal, setBal] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const balance = bal ?? Number(profile?.balance ?? 0);

  useEffect(() => { setBal(null); }, [profile?.balance]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => { if (alive) setMsgs(((data ?? []) as ChatMsg[]).reverse()); });
    const ch = supabase
      .channel("chat_messages_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as ChatMsg;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        setMsgs((cur) => cur.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    if (balance < 1) { toast.error("Solde insuffisant, rechargez"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("send_chat_message" as never, { _content: value } as never);
    setBusy(false);
    if (error) { toast.error(error.message.includes("Solde") ? "Solde insuffisant, rechargez" : error.message); return; }
    setText("");
    setBal(Number(data));
    void refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <AuthGate>
      <Layout>
        <section className="mx-auto flex h-[calc(100dvh-110px)] w-full max-w-3xl flex-col px-2 py-2">
          <div className="flex items-center justify-between gap-2 rounded-t-2xl border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold">👥 Groupe MADA - 1 Ar par message</h1>
              <p className="text-[10px] text-muted-foreground">Temps réel · {msgs.length} messages</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px]">
              Solde <strong className="bsm-neon-text">{formatAr(balance)}</strong>
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto border-x border-border bg-background/60 px-3 py-3">
            {msgs.map((m) => {
              const mine = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card border border-border"}`}>
                    {!mine ? <p className="text-[10px] font-bold text-primary">{m.author_name}</p> : null}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`mt-0.5 flex items-center justify-end gap-2 text-[9px] ${mine ? "opacity-75" : "text-muted-foreground"}`}>
                      {isAdmin ? <button onClick={() => void remove(m.id)} className="underline">suppr.</button> : null}
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            {!msgs.length ? <p className="pt-10 text-center text-xs text-muted-foreground">Tsy mbola misy message. Manorata voalohany ! 👋</p> : null}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="flex items-center gap-2 rounded-b-2xl border border-border bg-card px-3 py-2"
          >
            <input
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              placeholder="Message… (1 Ar)"
              className="bsm-input !py-2 !text-sm"
            />
            <button type="submit" disabled={busy || !text.trim()} className="bsm-btn bsm-btn-primary !px-4 !py-2 !text-sm">
              Envoyer
            </button>
          </form>
        </section>
      </Layout>
    </AuthGate>
  );
}
