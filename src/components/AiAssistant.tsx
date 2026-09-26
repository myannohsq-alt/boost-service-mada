import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME = "Salama tompoko 👋 Izaho no Service IA. Anontanio aho momba ny prix, commande, délai, recharge na tutoriel.";
const QUICK = ["Ohatrinona ny followers ?", "Ahoana no manao commande ?", "Ahoana no mi-recharge ?", "Tutoriel"];

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("assistant_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) setMsgs(data as Msg[]);
    })();
  }, []);

  const save = async (role: Msg["role"], content: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !content) return;
    const { error } = await supabase.from("assistant_messages").insert({ user_id: u.user.id, role, content });
    if (error) console.error("assistant save", error);
  };

  const clear = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) await supabase.from("assistant_messages").delete().eq("user_id", u.user.id);
    setMsgs([]);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);
  useEffect(() => { if (open && !busy) inputRef.current?.focus(); }, [open, busy]);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: value }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const setLast = (content: string) =>
      setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content }]);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return setLast("Midira aloha (connexion) vao afaka miresaka amiko 🙏");
      void save("user", value);
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      if (!res.ok || !res.body) {
        return setLast(res.status === 429 ? "Be loatra ny fangatahana, andramo afaka kelikely 🙏" : "Mifandraisa @ Support 🙏");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", out = "";
      for (;;) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buf += dec.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
              out += ev.delta;
              setLast(out);
            }
          } catch { /* ignore keep-alives */ }
        }
      }
      if (!out) setLast("Mifandraisa @ Support 🙏");
      else void save("assistant", out);
    } catch {
      setLast("Mifandraisa @ Support 🙏");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Service IA"
        className="fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/60 bg-background text-xl shadow-[0_8px_24px_-10px_var(--color-primary)] transition active:scale-95"
      >
        {open ? "✕" : "💬"}
      </button>

      {open ? (
        <div className="fixed bottom-20 right-3 z-50 flex h-[70vh] max-h-[540px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border bg-[image:var(--gradient-neon)] px-4 py-3 text-primary-foreground">
            <span className="text-lg">💬</span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Service IA</p>
              <p className="text-[10px] opacity-80">{busy ? "Manoratra…" : "En ligne"}</p>
            </div>
            {msgs.length ? (
              <button onClick={() => void clear()} disabled={busy} className="ml-auto rounded-full border border-current/40 px-2 py-0.5 text-[10px]">
                Hamafa
              </button>
            ) : null}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            <div className="max-w-[85%] rounded-2xl bg-secondary px-3 py-2 text-xs leading-relaxed">{WELCOME}</div>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "assistant" ? "bg-secondary text-foreground" : "ml-auto bg-primary text-primary-foreground"
                }`}
              >
                {m.content.replace(/\*\*/g, "") || <span className="animate-pulse">•••</span>}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {!msgs.length ? (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {QUICK.map((q) => (
                <button key={q} onClick={() => void send(q)} className="rounded-full border border-primary/40 px-2.5 py-1 text-[10px]">
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Soraty eto ny fanontanianao…"
              className="bsm-input !py-2 !text-xs"
            />
            <button type="submit" disabled={busy} className="bsm-btn bsm-btn-primary !px-3 !py-2 !text-xs">➤</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
