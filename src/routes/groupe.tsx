import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Mic, Square } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const Route = createFileRoute("/groupe")({
  head: () => ({
    meta: [
      { title: "Groupe MADA — Chat gratuit BOOST SERVICE MADA" },
      { name: "description", content: "Chat communautaire gratuit en temps réel des membres BOOST SERVICE MADA : texte, photos et vocaux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Groupe MADA — Chat BOOST SERVICE MADA" },
      { property: "og:description", content: "Discutez gratuitement en direct avec la communauté." },
    ],
  }),
  component: GroupPage,
});

type ChatMsg = { id: string; user_id: string; author_name: string; content: string; created_at: string; type?: string; media_path?: string | null; duration?: number | null; demo?: { avatar: string } };

function Media({ m }: { m: ChatMsg }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!m.media_path) return;
    void supabase.storage.from("uploads").createSignedUrl(m.media_path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [m.media_path]);
  if (!url) return <p className="text-[11px] opacity-70">Chargement…</p>;
  return m.type === "image" ? <img src={url} alt="Image partagée" className="mt-1 max-h-32 rounded-lg" /> : <audio controls src={url} className="mt-1 w-40" />;
}

function GroupPage() {
  const { user, profile, isAdmin } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [demo, setDemo] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recStart, setRecStart] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setMsgs(((data ?? []) as ChatMsg[]).reverse()); });
    void db.from("demo_messages").select("id, content, created_at, demo_profiles(name, avatar_url)").order("created_at")
      .then(({ data }: any) => alive && setDemo((data ?? []).map((d: any) => ({ id: `demo-${d.id}`, user_id: "", author_name: d.demo_profiles?.name ?? "", content: d.content, created_at: d.created_at, demo: { avatar: d.demo_profiles?.avatar_url ?? "" } }))));
    const ch = supabase.channel("chat_messages_live")
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

  const all = [...demo, ...msgs].sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [all.length]);

  const post = async (args: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await db.rpc("send_chat_message", args);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    if (await post({ _content: value })) setText("");
  };

  const uploadFile = async (blob: Blob, kind: "images" | "vocals", ext: string) => {
    if (!user) return null;
    const path = `${user.id}/${kind}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("uploads").upload(path, blob, { contentType: blob.type });
    if (error) { toast.error(error.message); return null; }
    return path;
  };

  const sendImage = async (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("Choisissez une image");
    const path = await uploadFile(f, "images", f.name.split(".").pop() || "jpg");
    if (path) await post({ _content: "", _type: "image", _media_path: path });
  };

  const toggleRec = async () => {
    if (rec) { rec.stop(); setRec(null); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const start = Date.now();
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const path = await uploadFile(blob, "vocals", "webm");
        if (path) await post({ _content: "", _type: "vocal", _media_path: path, _duration: Math.round((Date.now() - start) / 1000) });
      };
      r.start();
      setRecStart(start);
      setRec(r);
    } catch { toast.error("Micro non autorisé"); }
  };

  const remove = async (id: string) => {
    const { error } = id.startsWith("demo-")
      ? await db.from("demo_messages").delete().eq("id", id.slice(5))
      : await supabase.from("chat_messages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else if (id.startsWith("demo-")) setDemo((c) => c.filter((x) => x.id !== id));
  };

  return (
    <AuthGate>
      <Layout>
        <section className="mx-auto flex h-[calc(100dvh-110px)] w-full max-w-3xl flex-col px-2 py-2">
          <div className="flex items-center justify-between gap-2 rounded-t-2xl border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold">👥 Groupe MADA - Gratuit</h1>
              <p className="text-[10px] text-muted-foreground">Temps réel · {msgs.length} messages</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px]">
              Solde <strong className="bsm-neon-text">{formatAr(profile?.balance ?? 0)}</strong>
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto border-x border-border bg-background/60 px-3 py-3">
            {all.map((m) => {
              const mine = m.user_id === user?.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine ? <img src={m.demo?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.author_name)}`} alt="" className="h-7 w-7 rounded-full object-cover" /> : null}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-[#1e3a8a] text-white"}`}>
                    {!mine ? (
                      <p className="flex items-center gap-1 text-[10px] font-bold opacity-70">
                        {m.author_name}
                        {m.demo ? <span className="rounded bg-muted px-1 text-[9px] font-semibold text-muted-foreground">EXEMPLE</span> : null}
                      </p>
                    ) : null}
                    {m.content ? <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p> : null}
                    {m.type && m.type !== "text" ? <Media m={m} /> : null}
                    <p className="mt-0.5 flex items-center justify-end gap-2 text-[10px] opacity-70">
                      {isAdmin ? <button onClick={() => void remove(m.id)} className="underline">suppr.</button> : null}
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

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-b-2xl border border-border bg-card px-3 py-2">
            <label aria-label="Envoyer une photo" className="cursor-pointer rounded-full p-2 hover:bg-secondary">
              <Camera className="h-5 w-5" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void sendImage(f); }} />
            </label>
            <button type="button" onClick={() => void toggleRec()} aria-label={rec ? "Arrêter l'enregistrement" : "Enregistrer un vocal"} className={`rounded-full p-2 ${rec ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary"}`}>
              {rec ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {rec ? <RecTimer start={recStart} /> : (
              <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder="Message…" className="bsm-input !py-2 !text-sm" />
            )}
            <button type="submit" disabled={busy || !text.trim() || !!rec} className="bsm-btn bsm-btn-primary !px-4 !py-2 !text-sm">Envoyer</button>
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
