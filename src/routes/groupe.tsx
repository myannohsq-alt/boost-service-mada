import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Mic, Square, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;
const LS_KEY = "messages_groupe";

export const Route = createFileRoute("/groupe")({
  head: () => ({
    meta: [
      { title: "Groupe MADA — Chat BOOST SERVICE MADA" },
      { name: "description", content: "Chat communautaire en temps réel des clients BOOST SERVICE MADA : texte, photos et vocaux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Groupe MADA — Chat BOOST SERVICE MADA" },
      { property: "og:description", content: "Discutez en direct avec la communauté BoostMada." },
    ],
  }),
  component: GroupPage,
});

type ChatMsg = { id: string; user_id: string; author_name: string; content: string; created_at: string; type?: string; src?: string; duration?: number | null };

const loadLocal = (): ChatMsg[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; }
};
const saveLocal = (list: ChatMsg[]) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-50))); }
  catch { toast.error("Mémoire du téléphone pleine"); }
};
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b);
});

function GroupPage() {
  const { user, profile, refresh } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [local, setLocal] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recStart, setRecStart] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLocal(loadLocal()); }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from("chat_messages").select("*").eq("type", "text").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setMsgs(((data ?? []) as ChatMsg[]).reverse()); });
    const ch = supabase.channel("chat_messages_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as ChatMsg;
        if (m.type && m.type !== "text") return;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        setMsgs((cur) => cur.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [user]);

  const all = [...msgs, ...local].sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [all.length]);

  const addLocal = (m: Partial<ChatMsg>) => {
    const msg: ChatMsg = { id: `local-${Date.now()}`, user_id: user?.id ?? "", author_name: profile?.name || "Moi", content: "", created_at: new Date().toISOString(), ...m };
    setLocal((cur) => { const next = [...cur, msg]; saveLocal(next); return next; });
  };

  const send = async () => {
    if (preview) { addLocal({ type: "image", src: preview }); setPreview(null); return; }
    const value = text.trim();
    if (!value || busy) return;
    if ((profile?.balance ?? 0) < 1) { toast.error("Solde insuffisant, rechargez"); return; }
    setBusy(true);
    const { error } = await db.rpc("send_chat_message", { _content: value });
    setBusy(false);
    if (error) { toast.error(error.message.includes("Solde") ? "Solde insuffisant, rechargez" : error.message); return; }
    setText("");
    void refresh();
  };

  const pickImage = (f: File) => {
    if (!f.type.startsWith("image/")) { toast.error("Choisissez une image"); return; }
    const r = new FileReader();
    r.onload = () => setPreview(String(r.result));
    r.readAsDataURL(f);
  };

  const toggleRec = async () => {
    if (rec) { rec.stop(); setRec(null); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const start = Date.now();
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        // data URL instead of a blob: URL so the vocal still plays after reloading
        const src = await toDataUrl(blob).catch(() => URL.createObjectURL(blob));
        addLocal({ type: "vocal", src, duration: Math.max(1, Math.round((Date.now() - start) / 1000)) });
      };
      r.start();
      setRecStart(start);
      setRec(r);
    } catch { toast.error("Micro non autorisé"); }
  };

  const remove = async (id: string) => {
    if (id.startsWith("local-")) { setLocal((c) => { const n = c.filter((x) => x.id !== id); saveLocal(n); return n; }); return; }
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <AuthGate>
      <Layout>
        <section className="mx-auto flex h-[calc(100dvh-110px)] w-full max-w-3xl flex-col px-2 py-2">
          <div className="flex items-center justify-between gap-2 rounded-t-2xl border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold">👥 Groupe MADA - 1 Ar / message</h1>
              <p className="text-[10px] text-muted-foreground">Temps réel · {msgs.length} messages</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px]">
              Solde <strong className="text-primary">{formatAr(profile?.balance ?? 0)}</strong>
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto border-x border-border bg-background/60 px-3 py-3">
            {all.map((m) => {
              const mine = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine ? <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.author_name)}`} alt="" className="h-7 w-7 rounded-full" /> : null}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-secondary-foreground"}`}>
                    {!mine ? <p className="text-[10px] font-bold opacity-70">{m.author_name}</p> : null}
                    {m.content ? <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p> : null}
                    {m.type === "image" && m.src ? <img src={m.src} alt="Photo partagée" className="mt-1 max-h-[200px] max-w-[200px] rounded-lg" /> : null}
                    {m.type === "vocal" && m.src ? (
                      <div className="mt-1 flex items-center gap-2">
                        <audio controls src={m.src} className="w-48" />
                        <span className="text-[10px] opacity-80">{Math.floor((m.duration ?? 0) / 60)}:{String((m.duration ?? 0) % 60).padStart(2, "0")}</span>
                      </div>
                    ) : null}
                    <p className="mt-0.5 flex items-center justify-end gap-2 text-[10px] opacity-70">
                      {mine && m.id.startsWith("local-") ? <button onClick={() => void remove(m.id)} className="underline">suppr.</button> : null}
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {mine ? " ✓✓" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            {!all.length ? <p className="pt-10 text-center text-xs text-muted-foreground">Tsy mbola misy message. Manorata voalohany ! 👋</p> : null}
            <div ref={endRef} />
          </div>

          {preview ? (
            <div className="flex items-start gap-2 border-x border-t border-border bg-card px-3 py-2">
              <img src={preview} alt="Aperçu" className="max-h-[200px] max-w-[200px] rounded-lg" />
              <button type="button" aria-label="Annuler la photo" onClick={() => setPreview(null)} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-b-2xl border border-border bg-card px-3 py-2">
            <label aria-label="Envoyer une photo" className="cursor-pointer rounded-full p-2 hover:bg-secondary">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickImage(f); }} />
            </label>
            <button type="button" onClick={() => void toggleRec()} aria-label={rec ? "Arrêter l'enregistrement" : "Enregistrer un vocal"} className={`rounded-full p-2 ${rec ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary"}`}>
              {rec ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {rec ? <RecTimer start={recStart} /> : (
              <input value={text} maxLength={500} disabled={!!preview} onChange={(e) => setText(e.target.value)} placeholder={preview ? "Photo prête" : "Message… (1 Ar)"} className="bsm-input !py-2 !text-sm" />
            )}
            <button type="submit" disabled={busy || !!rec || (!preview && !text.trim())} className="bsm-btn bsm-btn-primary !px-4 !py-2 !text-sm">Envoyer</button>
          </form>
        </section>
      </Layout>
    </AuthGate>
  );
}

function RecTimer({ start }: { start: number }) {
  const [, set] = useState(0);
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), 500); return () => clearInterval(t); }, []);
  const s = Math.floor((Date.now() - start) / 1000);
  return <span className="flex-1 text-sm text-destructive">● {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}
