import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout, Logo } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Définissez un nouveau mot de passe pour votre compte BOOST SERVICE MADA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Nouveau mot de passe — BOOST SERVICE MADA" },
      { property: "og:description", content: "Réinitialisez votre mot de passe en toute sécurité." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setMsg(null);
    if (password.length < 6) return setMsg("❌ Mot de passe : 6 caractères minimum.");
    if (password !== confirm) return setMsg("❌ Les mots de passe ne correspondent pas.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg(`❌ ${error.message}`);
    setMsg("✅ Mot de passe mis à jour.");
    void navigate({ to: "/profil" });
  };

  return (
    <Layout>
      <section className="mx-auto w-full max-w-md px-4 py-10">
        <div className="text-center">
          <div className="mx-auto w-fit animate-float">
            <Logo size={72} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Nouveau mot de passe 🔑</h1>
        </div>
        <div className="bsm-card mt-6 space-y-3 p-5">
          <div>
            <label className="text-xs text-muted-foreground">🔒 Nouveau mot de passe</label>
            <input
              type="password"
              value={password}
              maxLength={72}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              className="bsm-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">🔁 Confirmation</label>
            <input
              type="password"
              value={confirm}
              maxLength={72}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              className="bsm-input mt-1"
            />
          </div>
          {msg ? <p className="rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}
          <button
            disabled={busy}
            onClick={submit}
            className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
          >
            {busy ? "..." : "Enregistrer"}
          </button>
        </div>
      </section>
    </Layout>
  );
}
