import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Layout, Section } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/groupe")({
  head: () => ({
    meta: [
      { title: "Groupe de discussion — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Espace communautaire BOOST SERVICE MADA : questions, astuces, entraide et annonces entre membres malagasy.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Groupe de discussion — BOOST SERVICE MADA" },
      { property: "og:description", content: "Échangez avec les autres membres de la plateforme." },
    ],
  }),
  component: GroupPage,
});

const CATEGORIES = [
  { id: "general", label: "💬 Général" },
  { id: "question", label: "❓ Questions" },
  { id: "astuce", label: "💡 Astuces" },
  { id: "annonce", label: "📢 Annonces" },
];

const EMOJIS = ["👍", "❤️", "🔥"];

type Post = {
  id: string;
  user_id: string;
  author_name: string;
  category: string;
  content: string;
  pinned: boolean;
  locked: boolean;
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type Reaction = { id: string; post_id: string; user_id: string; emoji: string };

function GroupPage() {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [cat, setCat] = useState("all");
  const [content, setContent] = useState("");
  const [postCat, setPostCat] = useState("general");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["community"],
    queryFn: async () => {
      const [posts, comments, reactions] = await Promise.all([
        supabase
          .from("community_posts")
          .select("*")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("community_comments").select("*").order("created_at"),
        supabase.from("community_reactions").select("*"),
      ]);
      return {
        posts: (posts.data ?? []) as Post[],
        comments: (comments.data ?? []) as Comment[],
        reactions: (reactions.data ?? []) as Reaction[],
      };
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["community"] });
  const authorName = profile?.name || profile?.email || "Membre";

  const posts = useMemo(
    () => (data?.posts ?? []).filter((p) => cat === "all" || p.category === cat),
    [data, cat],
  );

  const publish = async () => {
    if (content.trim().length < 3) return toast.error("Écrivez un message plus long.");
    setBusy(true);
    const { error } = await supabase.from("community_posts").insert({
      user_id: user!.id,
      author_name: authorName,
      category: postCat,
      content: content.trim(),
    });
    setBusy(false);
    if (error) return toast.error(`❌ ${error.message}`);
    setContent("");
    toast.success("✅ Publication envoyée");
    await refetch();
  };

  const react = async (postId: string, emoji: string) => {
    const mine = (data?.reactions ?? []).find(
      (r) => r.post_id === postId && r.user_id === user!.id && r.emoji === emoji,
    );
    if (mine) await supabase.from("community_reactions").delete().eq("id", mine.id);
    else
      await supabase
        .from("community_reactions")
        .insert({ post_id: postId, user_id: user!.id, emoji });
    await refetch();
  };

  const moderate = async (post: Post, values: Partial<Post>) => {
    const { error } = await supabase.from("community_posts").update(values).eq("id", post.id);
    if (error) return toast.error(`❌ ${error.message}`);
    await refetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) return toast.error(`❌ ${error.message}`);
    toast.success("🗑️ Publication supprimée");
    await refetch();
  };

  return (
    <AuthGate>
      <Layout>
        <Section
          title="👥 Groupe de discussion"
          subtitle="Posez vos questions, partagez vos astuces et échangez avec la communauté."
        >
          <div className="bsm-card space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPostCat(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    postCat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              value={content}
              maxLength={1000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Soraty eto ny hafatrao…"
              className="bsm-input min-h-24"
            />
            <button
              disabled={busy}
              onClick={() => void publish()}
              className="bsm-btn bsm-btn-primary disabled:opacity-50"
            >
              {busy ? "Envoi…" : "🚀 Publier"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[{ id: "all", label: "🌐 Tout" }, ...CATEGORIES].map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  cat === c.id ? "bg-gold text-background" : "bg-secondary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                comments={(data?.comments ?? []).filter((c) => c.post_id === p.id)}
                reactions={(data?.reactions ?? []).filter((r) => r.post_id === p.id)}
                userId={user!.id}
                authorName={authorName}
                isAdmin={isAdmin}
                onReact={react}
                onModerate={moderate}
                onDelete={remove}
                onRefetch={refetch}
              />
            ))}
            {!posts.length ? (
              <p className="text-sm text-muted-foreground">Aucune publication pour le moment.</p>
            ) : null}
          </div>
        </Section>
      </Layout>
    </AuthGate>
  );
}

function PostCard({
  post,
  comments,
  reactions,
  userId,
  authorName,
  isAdmin,
  onReact,
  onModerate,
  onDelete,
  onRefetch,
}: {
  post: Post;
  comments: Comment[];
  reactions: Reaction[];
  userId: string;
  authorName: string;
  isAdmin: boolean;
  onReact: (postId: string, emoji: string) => Promise<void>;
  onModerate: (post: Post, values: Partial<Post>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRefetch: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const send = async () => {
    if (text.trim().length < 2) return;
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: userId,
      author_name: authorName,
      content: text.trim(),
    });
    if (error) return toast.error(`❌ ${error.message}`);
    setText("");
    await onRefetch();
  };

  const category = CATEGORIES.find((c) => c.id === post.category)?.label ?? post.category;

  return (
    <article className="bsm-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-primary">
          {category}
        </span>
        {post.pinned ? <span className="text-xs text-gold">📌 Épinglé</span> : null}
        {post.locked ? <span className="text-xs text-muted-foreground">🔒 Verrouillé</span> : null}
        <span className="ml-auto text-[11px] text-muted-foreground">
          {new Date(post.created_at).toLocaleString("fr-FR")}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold">{post.author_name}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{post.content}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {EMOJIS.map((e) => {
          const count = reactions.filter((r) => r.emoji === e).length;
          const mine = reactions.some((r) => r.emoji === e && r.user_id === userId);
          return (
            <button
              key={e}
              onClick={() => void onReact(post.id, e)}
              className={`rounded-full border px-3 py-1 text-xs transition-transform active:scale-95 ${
                mine ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary"
              }`}
            >
              {e} {count}
            </button>
          );
        })}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-border bg-secondary px-3 py-1 text-xs"
        >
          💬 {comments.length}
        </button>

        {isAdmin ? (
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => void onModerate(post, { pinned: !post.pinned })}
              className="rounded-full bg-secondary px-3 py-1 text-xs"
            >
              📌 {post.pinned ? "Désépingler" : "Épingler"}
            </button>
            <button
              onClick={() => void onModerate(post, { locked: !post.locked })}
              className="rounded-full bg-secondary px-3 py-1 text-xs"
            >
              🔒 {post.locked ? "Déverrouiller" : "Verrouiller"}
            </button>
            <button
              onClick={() => void onDelete(post.id)}
              className="rounded-full bg-destructive px-3 py-1 text-xs text-destructive-foreground"
            >
              🗑️
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-secondary p-3">
              <p className="text-xs font-semibold">{c.author_name}</p>
              <p className="text-sm text-foreground/90">{c.content}</p>
            </div>
          ))}
          {post.locked ? (
            <p className="text-xs text-muted-foreground">🔒 Les commentaires sont fermés.</p>
          ) : (
            <div className="flex gap-2">
              <input
                value={text}
                maxLength={500}
                onChange={(e) => setText(e.target.value)}
                placeholder="Votre commentaire…"
                className="bsm-input flex-1"
              />
              <button onClick={() => void send()} className="bsm-btn bsm-btn-primary !px-4 !py-2 !text-xs">
                Envoyer
              </button>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
