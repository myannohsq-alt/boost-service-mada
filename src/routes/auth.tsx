import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Logo } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] as string } : {},
  head: () => ({
    meta: [
      { title: "Connexion & Inscription — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Connectez-vous avec Google ou votre email pour accéder aux services de boost réseaux sociaux BOOST SERVICE MADA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Connexion — BOOST SERVICE MADA" },
      { property: "og:description", content: "Accédez à votre compte, votre solde et vos commandes." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const { ref } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [refCode, setRefCode] = useState(ref ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/services" });
  }, [user, navigate]);

  const google = async () => {
    setMsg(null);
    setBusy(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    }
    setBusy(false);
  };

  const submit = async () => {
    setMsg(null);
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setMsg("❌ Adresse email invalide.");

    if (mode === "forgot") {
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      return setMsg(error ? `❌ ${error.message}` : "✅ Lien de réinitialisation envoyé par email.");
    }

    if (password.length < 6) return setMsg("❌ Mot de passe : 6 caractères minimum.");

    if (mode === "signup") {
      if (lastName.trim().length < 2) return setMsg("❌ Entrez votre nom.");
      if (firstName.trim().length < 2) return setMsg("❌ Entrez votre prénom.");
      if (password !== confirm) return setMsg("❌ Les mots de passe ne correspondent pas.");
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: `${firstName.trim()} ${lastName.trim()}`,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            referral_code: refCode.trim().toUpperCase(),
          },
        },
      });
      setBusy(false);
      if (error)
        return setMsg(
          error.message.toLowerCase().includes("already")
            ? "❌ Cette adresse email est déjà utilisée."
            : `❌ ${error.message}`,
        );
      if (!data.session)
        return setMsg("✅ Compte créé ! Vérifiez votre email pour confirmer votre inscription.");
      return setMsg("✅ Compte créé, connexion en cours…");
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (error) return setMsg("❌ Email ou mot de passe incorrect.");
  };

  const title = mode === "login" ? "Connexion 🔐" : mode === "signup" ? "Inscription 🚀" : "Mot de passe oublié 🔑";

  return (
    <Layout>
      <section className="mx-auto w-full max-w-md px-4 py-10">
        <div className="text-center">
          <div className="mx-auto w-fit animate-float rounded-full p-2 shadow-[0_0_60px_-12px_hsl(var(--primary))]">
            <Logo size={84} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">BOOST SERVICE MADA</h1>
          <p className="mt-1 text-sm text-gold">Boostez vos réseaux sociaux</p>
        </div>

        <div className="bsm-card mt-6 space-y-4 p-5 shadow-[0_0_40px_-20px_hsl(var(--primary))]">
          <h2 className="text-center font-display text-lg font-semibold">{title}</h2>

          {mode !== "forgot" ? (
            <>
              <button
                disabled={busy}
                onClick={google}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-50"
              >
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 40.3 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
                </svg>
                Continuer avec Google
              </button>

              <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          {mode === "signup" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  👤 Nom <span className="text-gold">*</span>
                </label>
                <input
                  value={lastName}
                  maxLength={40}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bsm-input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  🙋 Prénom <span className="text-gold">*</span>
                </label>
                <input
                  value={firstName}
                  maxLength={40}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bsm-input mt-1"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label className="text-xs text-muted-foreground">📧 Adresse Email</label>
            <input
              value={email}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              placeholder="vous@exemple.com"
              onChange={(e) => setEmail(e.target.value)}
              className="bsm-input mt-1"
            />
          </div>

          {mode !== "forgot" ? (
            <div>
              <label className="text-xs text-muted-foreground">🔒 Mot de passe</label>
              <input
                type="password"
                value={password}
                maxLength={72}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
          ) : null}

          {mode === "signup" ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground">🔁 Confirmation du mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  maxLength={72}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  className="bsm-input mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">🎁 Code parrainage (optionnel)</label>
                <input
                  value={refCode}
                  maxLength={12}
                  onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                  className="bsm-input mt-1"
                />
              </div>
            </>
          ) : null}

          {msg ? <p className="rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}

          <button
            disabled={busy}
            onClick={submit}
            className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
          >
            {busy
              ? "..."
              : mode === "login"
                ? "Se connecter"
                : mode === "signup"
                  ? "Créer mon compte"
                  : "Envoyer le lien"}
          </button>

          {mode === "login" ? (
            <button
              onClick={() => {
                setMode("forgot");
                setMsg(null);
              }}
              className="w-full text-center text-xs text-gold underline"
            >
              Mot de passe oublié ?
            </button>
          ) : null}

          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMsg(null);
            }}
            className="w-full text-center text-xs text-muted-foreground underline"
          >
            {mode === "login" ? "Créer un compte" : "Déjà inscrit ? Connexion"}
          </button>
        </div>
      </section>
    </Layout>
  );
}
