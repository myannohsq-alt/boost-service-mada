import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Zap, Mail, LockKeyhole, Smartphone, Download, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/useAuth";
import { AiAssistant } from "@/components/AiAssistant";

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
const inputClass = "mt-2 h-14 w-full rounded-xl border border-border bg-auth-input px-4 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30";

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
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowNotif(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const openApk = () => {
    document.getElementById("apkBtn")?.click();
  };

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
    <main className="dark relative flex min-h-screen items-start justify-center overflow-hidden bg-background px-5 py-10 text-foreground sm:items-center sm:py-12">
      {loading || user ? (
        <span className="text-sm text-muted-foreground">Chargement…</span>
      ) : (
        <section className="relative z-10 w-full max-w-[400px]" aria-label="Connexion BoostMada">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-mark text-primary shadow-[0_0_28px_-4px_var(--color-primary)]">
            <Zap aria-hidden="true" className="h-8 w-8 fill-current" />
          </div>
          <h1 className="font-sans text-[28px] font-bold leading-tight sm:text-3xl">
            BOOST SERVICE MADA
            <span className="mt-2 block text-xl font-semibold leading-snug">Boostez vos réseaux sociaux à Madagascar</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signup" ? "Créez votre compte" : mode === "forgot" ? "Réinitialisez votre mot de passe" : "Connectez-vous à votre compte"}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
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
              <span className="relative block"><Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-6 h-5 w-5 text-muted-foreground" />
              <input required value={email} type="email" inputMode="email" autoComplete="email" maxLength={120} placeholder="vous@email.com" onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-12`} /></span>
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm font-medium">Mot de passe
                <span className="relative block"><LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-6 h-5 w-5 text-muted-foreground" />
                <input required type="password" value={password} minLength={6} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pl-12`} /></span>
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
            <Button disabled={busy} type="submit" size="lg" className="h-14 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-[0_12px_32px_-8px_var(--color-primary)] hover:bg-primary/90">
              {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </Button>
          </form>

          {mode === "login" && (
            <Button variant="link" onClick={() => changeMode("forgot")} className="mt-3 h-auto w-full justify-end px-0 text-primary">
              Mot de passe oublié ?
            </Button>
          )}
          {mode !== "forgot" && (
            <>
              <div className="my-5 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="h-px flex-1 bg-border" />OU<span className="h-px flex-1 bg-border" />
              </div>
              <div className="relative pt-3">
              <span className="absolute right-3 top-0 z-10 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground"><Star className="h-3 w-3 fill-current" /> RECOMMANDÉ</span>
              <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-14 w-full rounded-xl border-primary bg-auth-input text-foreground shadow-[0_0_18px_-9px_var(--color-primary)] hover:bg-secondary hover:text-foreground">
                <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
                  <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                  <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 40.3 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
                </svg>
                Continuer avec Google
              </Button>
              </div>
            </>
          )}
          {mode === "login" && <div className="mt-7 border-t border-border pt-6 text-center">
            <p className="mb-3 text-sm font-semibold">Installez Boost Service Mada</p>
            <a id="apkBtn" href="/boost-service-mada.apk" onClick={(event) => { event.preventDefault(); setShowNotif(false); setMsg("L'application sera bientôt disponible au téléchargement."); }} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-[0_12px_32px_-8px_var(--color-primary)] transition hover:bg-primary/90">
              <Smartphone className="h-5 w-5 shrink-0" /> Télécharger l'application <Download className="h-5 w-5 shrink-0" />
            </a>
          </div>}
          <p className="mt-5 text-center text-sm text-muted-foreground sm:mt-8">
            {mode === "login" ? "Pas encore de compte ?" : mode === "signup" ? "Déjà inscrit ?" : "Vous vous souvenez de votre mot de passe ?"}{" "}
            <Button variant="link" onClick={() => changeMode(mode === "login" ? "signup" : "login")} className="h-auto p-0 font-semibold text-primary">
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </Button>
          </p>
        </section>
      )}
      {!loading && !user && <AiAssistant orange />}
      {!loading && !user && showNotif && <div id="notif" role="dialog" aria-label="Installer l'application ?" className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 rounded-md border-l-4 border-primary bg-notice-background p-4 text-notice-foreground shadow-2xl sm:bottom-6">
        <div className="flex items-start justify-between gap-2"><h2 className="font-sans text-base font-bold">Installer l'application ?</h2><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setShowNotif(false)} className="-mr-2 -mt-2 h-8 w-8 text-notice-foreground"><X className="h-4 w-4" /></Button></div>
        <p className="mt-1 text-sm">Téléchargez l'APK pour une expérience 2x plus rapide !</p>
        <div className="mt-4 flex gap-2"><Button onClick={openApk} className="bg-primary text-primary-foreground hover:bg-primary/90">Installer</Button><Button variant="outline" onClick={() => setShowNotif(false)} className="border-border bg-notice-background text-notice-foreground hover:bg-muted">Plus tard</Button></div>
      </div>}
    </main>
  );
}
