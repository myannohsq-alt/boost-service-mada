import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, ImagePlus, Loader2, MessagesSquare, Mic, Send, Square, Trash2, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { DisplayName } from "@/components/AdminBadge";
import { useAuth } from "@/lib/useAuth";
import { formatAr } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;
const LS_KEY = "messages_groupe";
const MAX_IMG = 5 * 1024 * 1024;
const IMG_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const Route = createFileRoute("/groupe")({
  head: () => ({
    meta: [
      { title: "Groupe BOOST SERVICE MADA — Discussion publique" },
      { name: "description", content: "Discussion publique en temps réel des clients BOOST SERVICE MADA : messages et images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Groupe BOOST SERVICE MADA — Discussion publique" },
      { property: "og:description", content: "Discutez et partagez des images avec la communauté BoostMada." },
    ],
  }),
  component: GroupPage,
});

type ChatMsg = { id: string; user_id: string; author_name: string; content: string; created_at: string; type?: string; src?: string; media_path?: string | null; duration?: number | null };

const loadLocal = (): ChatMsg[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const saveLocal = (list: ChatMsg[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(-50))); } catch { toast.error("Mémoire du téléphone pleine"); } };
const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });

function GroupPage() {
  const { user, profile, refresh, isAdmin } = useAuth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [local, setLocal] = useState<ChatMsg[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; path: string } | null>(null);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [recStart, setRecStart] = useState(0);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  useEffect(() => { setLocal(user ? loadLocal().filter((m) => m.user_id === user.id && m.type === "vocal") : []); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from("chat_messages").select("*").in("type", ["text", "image"]).order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (alive) setMsgs(((data ?? []) as ChatMsg[]).reverse()); });
    const ch = supabase.channel("chat_messages_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as ChatMsg;
        if (m.type === "vocal") return;
        setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur, m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        setMsgs((cur) => cur.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [user]);

  // Signed URLs for stored images (bucket is private)
  useEffect(() => {
    const missing = msgs.filter((m) => m.type === "image" && m.media_path && !urls[m.media_path]).map((m) => m.media_path as string);
    if (!missing.length) return;
    void supabase.storage.from("uploads").createSignedUrls(missing, 60 * 60 * 6).then(({ data }) => {
      const next: Record<string, string> = {};
      (data ?? []).forEach((d) => { if (d.path && d.signedUrl) next[d.path] = d.signedUrl; });
      setUrls((u) => ({ ...u, ...next }));
    });
  }, [msgs, urls]);

  const all = [...msgs, ...local].sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => { if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight; }, [all.length]);

  const pickImage = (f: File) => {
    if (!IMG_TYPES[f.type]) { toast.error("Formats acceptés : JPG, PNG, WEBP"); return; }
    if (f.size > MAX_IMG) { toast.error("Image trop lourde (max 5 Mo)"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const clearImage = () => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null); };

  const send = async () => {
    if (!user || sending.current) return;
    const value = text.trim();
    if (!file && !value) return;
    if (value && !isAdmin && (profile?.balance ?? 0) < 1) { toast.error("Solde insuffisant, rechargez"); return; }
    sending.current = true; setBusy(true);
    try {
      if (file) {
        const path = `${user.id}/chat-${Date.now()}.${IMG_TYPES[file.type]}`;
        const up = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
        if (up.error) throw new Error("Échec de l'envoi de l'image");
        const { error } = await db.rpc("send_chat_message", { _content: value, _type: "image", _media_path: path });
        if (error) throw error;
        clearImage();
        setText("");
        void refresh();
      } else if (value) {
        const { error } = await db.rpc("send_chat_message", { _content: value });
        if (error) throw error;
        setText("");
        void refresh();
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      toast.error(msg.includes("Solde") ? "Solde insuffisant, rechargez" : msg);
    } finally { sending.current = false; setBusy(false); }
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("uploads").download(path);
    if (error || !data) { toast.error("Téléchargement impossible"); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(data);
    a.download = path.split("/").pop() || "image.jpg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
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
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        if (!blob.size) { toast.error("Vocal vide, réessayez"); return; }
        const src = await toDataUrl(blob).catch(() => URL.createObjectURL(blob));
        const msg: ChatMsg = { id: `local-${Date.now()}`, user_id: user?.id ?? "", author_name: profile?.name || "Moi", content: "", created_at: new Date().toISOString(), type: "vocal", src, duration: Math.max(1, Math.round((Date.now() - start) / 1000)) };
        setLocal((cur) => { const next = [...cur, msg]; saveLocal(next); return next; });
      };
      r.start(); setRecStart(start); setRec(r);
    } catch { toast.error("Micro non autorisé"); }
  };

  const remove = async (m: ChatMsg) => {
    if (m.id.startsWith("local-")) { setLocal((c) => { const n = c.filter((x) => x.id !== m.id); saveLocal(n); return n; }); return; }
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  };

  return (
    <AuthGate>
      <Layout hideAnnouncement>
        <section className="mx-auto flex h-[calc(100dvh-60px)] w-full max-w-3xl flex-col px-2 py-2">
          <div className="flex items-center gap-3 rounded-t-2xl border border-border bg-card px-3 py-3">
            <Link to="/services" aria-label="Retour" className="rounded-full p-1.5 hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></Link>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><MessagesSquare className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold">Groupe BOOST SERVICE MADA</h1>
              <p className="text-[11px] text-muted-foreground">Discussion publique · 1 Ar / message texte</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-background px-2.5 py-1 text-[11px]">
              <strong className="text-primary">{formatAr(profile?.balance ?? 0)}</strong>
            </span>
          </div>

          <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto border-x border-border bg-background/60 px-3 py-3">
            {all.map((m) => {
              const mine = m.user_id === user?.id;
              const imgUrl = m.media_path ? urls[m.media_path] : undefined;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                  {!mine ? <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.author_name)}`} alt="" className="h-8 w-8 shrink-0 rounded-full" /> : null}
                  <div className={`max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-card text-card-foreground"}`}>
                    {!mine ? <p className="mb-0.5 text-[11px] text-primary"><DisplayName name={m.author_name} /></p> : null}
                    {m.type === "image" ? (
                      imgUrl ? (
                        <button type="button" onClick={() => setViewer({ url: imgUrl, path: m.media_path! })} className="block">
                          <img src={imgUrl} alt="Image partagée" loading="lazy" className="max-h-64 w-full max-w-[240px] rounded-lg object-cover" />
                        </button>
                      ) : <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-secondary"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : null}
                    {m.content ? <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p> : null}
                    {m.type === "vocal" && m.src ? <audio controls src={m.src} className="mt-1 w-48" /> : null}
                    <p className="mt-0.5 flex items-center justify-end gap-2 text-[10px] opacity-70">
                      {(isAdmin || (mine && m.id.startsWith("local-"))) ? <button onClick={() => void remove(m)} aria-label="Supprimer"><Trash2 className="h-3 w-3" /></button> : null}
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            {!all.length ? (
              <div className="flex flex-col items-center pt-16 text-center text-muted-foreground">
                <MessagesSquare className="h-10 w-10 text-primary/60" />
                <p className="mt-2 text-sm font-semibold">Tsy mbola misy message</p>
                <p className="text-xs">Manorata voalohany ! 👋</p>
              </div>
            ) : null}
          </div>

          {preview ? (
            <div className="flex items-start gap-2 border-x border-t border-border bg-card px-3 py-2">
              <img src={preview} alt="Aperçu" className="max-h-40 max-w-[180px] rounded-lg object-contain" />
              <button type="button" aria-label="Retirer l'image" onClick={clearImage} className="rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
          ) : null}

          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="sticky bottom-0 flex items-end gap-2 rounded-b-2xl border border-border bg-card px-3 py-2">
            <label aria-label="Joindre une image" className="cursor-pointer rounded-full p-2 text-primary hover:bg-secondary">
              <ImagePlus className="h-5 w-5" />
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pickImage(f); }} />
            </label>
            <button type="button" onClick={() => void toggleRec()} aria-label={rec ? "Arrêter" : "Vocal"} className={`rounded-full p-2 ${rec ? "bg-destructive text-destructive-foreground" : "hover:bg-secondary"}`}>
              {rec ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {rec ? <RecTimer start={recStart} /> : (
              <textarea value={text} maxLength={500} rows={1}
                onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
                placeholder={file ? "Légende (optionnel)…" : "Message…"} className="bsm-input !py-2 !text-sm resize-none leading-snug" style={{ maxHeight: 160 }} />
            )}
            <button type="submit" aria-label="Envoyer" disabled={busy || !!rec || (!file && !text.trim())} className="bsm-btn bsm-btn-primary !px-3 !py-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>

        {viewer ? (
          <div className="fixed inset-0 z-[90] flex flex-col bg-background/95" onClick={() => setViewer(null)}>
            <div className="flex justify-between p-3" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => void download(viewer.path)} className="bsm-btn bsm-btn-primary !px-3 !py-2 !text-xs"><Download className="h-4 w-4" /> Télécharger l'image</button>
              <button onClick={() => setViewer(null)} aria-label="Fermer" className="rounded-full border border-border p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto p-2">
              <img src={viewer.url} alt="Image en grand" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        ) : null}
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
