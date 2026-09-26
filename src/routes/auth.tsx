import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] as string } : {},
  head: () => ({
    meta: [
      { title: "Connexion & Inscription — BOOST SERVICE MADA" },
      { name: "description", content: "Connectez-vous à BoostMada pour commander vos services de boost Facebook, TikTok, Instagram et YouTube à Madagascar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Connexion — BOOST SERVICE MADA" },
      { property: "og:description", content: "Accédez à votre compte BoostMada, votre solde et vos commandes." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";
const inputClass = "mt-1.5 h-12 w-full rounded-lg border border-border bg-secondary px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:mt-2 sm:h-13";

export function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [refCode, setRefCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setRefCode(ref);
  }, []);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/services", replace: true });
  }, [user, loading, navigate]);

  const google = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) setMsg(`❌ ${result.error.message}`);
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          emailRedirectTo: `${window.location.origin}/services`,
          data: {
            name: `${firstName.trim()} ${lastName.trim()}`,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            referral_code: refCode.trim().toUpperCase(),
          },
        },
      });
      setBusy(false);
      if (error) return setMsg(error.message.toLowerCase().includes("already") ? "❌ Cette adresse email est déjà utilisée." : `❌ ${error.message}`);
      if (!data.session) return setMsg("✅ Compte créé ! Vérifiez votre email pour confirmer votre inscription.");
      void navigate({ to: "/services", replace: true });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
    setBusy(false);
    if (error) return setMsg("❌ Email ou mot de passe incorrect.");
    void navigate({ to: "/services", replace: true });
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setMsg(null);
  };

  return (
    <main className="dark flex min-h-screen items-start justify-center bg-background px-6 py-6 text-foreground sm:items-center sm:py-12">
      {loading || user ? (
        <span className="text-sm text-muted-foreground">Chargement…</span>
      ) : (
        <section className="w-full max-w-sm" aria-label="Connexion BoostMada">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[image:var(--gradient-neon)] text-primary-foreground shadow-lg shadow-primary/20 sm:mb-9 sm:h-14 sm:w-14">
            <Zap aria-hidden="true" className="h-7 w-7 fill-current" />
          </div>
          <h1 className="font-sans text-2xl font-bold leading-tight sm:text-4xl">
            BOOST SERVICE MADA
            <span className="mt-1.5 block text-lg font-semibold sm:mt-2 sm:text-2xl">Boostez vos réseaux sociaux à Madagascar</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-4">
            {mode === "signup" ? "Créez votre compte" : mode === "forgot" ? "Réinitialisez votre mot de passe" : "Connectez-vous à votre compte"}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4 sm:mt-9 sm:space-y-5">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">Nom
                  <input required maxLength={40} value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} autoComplete="family-name" />
                </label>
                <label className="block text-sm font-medium">Prénom
                  <input required maxLength={40} value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} autoComplete="given-name" />
                </label>
              </div>
            )}
            <label className="block text-sm font-medium">Email
              <input required value={email} type="email" inputMode="email" autoComplete="email" maxLength={120} placeholder="vous@email.com" onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm font-medium">Mot de passe
                <input required type="password" value={password} minLength={6} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </label>
            )}
            {mode === "signup" && (
              <>
                <label className="block text-sm font-medium">Confirmer le mot de passe
                  <input required type="password" value={confirm} maxLength={72} autoComplete="new-password" placeholder="••••••••" onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
                </label>
                {refCode && <p className="text-xs text-muted-foreground">Code parrainage : {refCode}</p>}
              </>
            )}
            {msg && <p role="status" className="rounded-md bg-secondary p-3 text-sm">{msg}</p>}
            <Button disabled={busy} type="submit" size="lg" className="h-12 w-full bg-[image:var(--gradient-neon)] text-base font-bold text-primary-foreground hover:opacity-90 sm:h-13">
              {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </Button>
          </form>

          {mode === "login" && (
            <Button variant="link" onClick={() => changeMode("forgot")} className="mt-2 h-auto w-full text-primary sm:mt-3">
              Mot de passe oublié ?
            </Button>
          )}
          {mode !== "forgot" && (
            <>
              <div className="my-4 flex items-center gap-4 text-xs font-medium text-muted-foreground sm:my-7">
                <span className="h-px flex-1 bg-border" />OU<span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full border-border bg-secondary text-foreground hover:bg-muted hover:text-foreground sm:h-12">
                <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 40.3 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
                </svg>
                Continuer avec Google
              </Button>
            </>
          )}
          <p className="mt-5 text-center text-sm text-muted-foreground sm:mt-8">
            {mode === "login" ? "Pas encore de compte ?" : mode === "signup" ? "Déjà inscrit ?" : "Vous vous souvenez de votre mot de passe ?"}{" "}
            <Button variant="link" onClick={() => changeMode(mode === "login" ? "signup" : "login")} className="h-auto p-0 font-semibold text-primary">
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </Button>
          </p>
        </section>
      )}
    </main>
  );
}
