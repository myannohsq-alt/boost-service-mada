import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, LockKeyhole, Download, Star, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/useAuth";
import { AiAssistant } from "@/components/AiAssistant";
import { publicPageHead } from "@/lib/seo";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" ? { ref: search["ref"] as string } : {},
  head: () => publicPageHead("/auth", "Connexion et inscription — BoostMada", "Créez votre compte BoostMada ou connectez-vous pour accéder aux services, à votre solde en Ariary et au suivi de vos commandes.", true),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";
const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-border bg-auth-input px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-auth-primary focus:ring-2 focus:ring-auth-primary/30";

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
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setShowNotif(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowNotif(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  const installApp = async () => {
    setShowNotif(false);
    if (installPrompt) {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      return;
    }
    setMsg("⋮ menu > Installer l'application (ou Ajouter à l'écran d'accueil sur iPhone).");
  };

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) { setRefCode(ref); localStorage.setItem("bsm_ref", ref.slice(0, 20)); }
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
    <main className="dark relative flex min-h-screen items-start justify-center bg-background px-4 py-8 text-foreground sm:items-center sm:py-10">
      {loading || user ? (
        <span className="text-sm text-muted-foreground">Chargement…</span>
      ) : (
        <section className="relative z-10 w-full max-w-[400px]" aria-label="Connexion BoostMada">
          <header className="mb-5 text-center">
            <img src="/social/boostmada-share.jpg" alt="SMM B&S — BOOST SERVICE MADA, 100% Gasy" width={1200} height={630} fetchPriority="high" className="mb-4 aspect-[1200/630] w-full rounded-lg object-contain" />
            <h1 className="font-sans text-xl font-bold leading-tight text-foreground">BOOST SERVICE MADA</h1>
            <p className="mt-2 text-sm font-medium text-auth-subtitle">Boostez vos réseaux sociaux - 100% Gasy</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Réactions, abonnés, vues et commentaires sur Facebook, TikTok, Instagram et YouTube.</p>
            <p className="mt-2 text-xs text-muted-foreground">Paiements en Ariary · MVola · Orange Money · Airtel</p>
            {mode === "login" && <Button onClick={() => changeMode("signup")} className="auth-primary-button mt-4 h-11 w-full rounded-lg font-semibold">Créer mon compte <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>}
          </header>
          <div className="rounded-[20px] border border-border bg-card p-6 shadow-[0_18px_48px_-24px_var(--color-background)]">
          <h2 className="text-center font-sans text-lg font-bold text-foreground">
            {mode === "signup" ? "Créer mon compte" : mode === "forgot" ? "Réinitialiser mon mot de passe" : "Déjà client ? Connectez-vous"}
          </h2>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
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
              <span className="relative block"><Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
              <input required value={email} type="email" inputMode="email" autoComplete="email" maxLength={120} placeholder="vous@email.com" onChange={(e) => setEmail(e.target.value)} className={`${inputClass} pl-12`} /></span>
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm font-medium">Mot de passe
                <span className="relative block"><LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
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
            <Button disabled={busy} type="submit" className="auth-primary-button mt-1 h-11 w-full rounded-xl text-sm font-bold uppercase hover:opacity-90">
              {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"}
            </Button>
          </form>

          {mode === "login" && (
            <Button variant="link" onClick={() => changeMode("forgot")} className="mt-2 h-auto w-full justify-end px-0 text-auth-primary">
              Mot de passe oublié ?
            </Button>
          )}
          {mode !== "forgot" && (
            <>
               <div className="my-4 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="h-px flex-1 bg-border" />OU<span className="h-px flex-1 bg-border" />
              </div>
              <div className="relative pt-3">
               <span className="absolute right-3 top-0 z-10 flex items-center gap-1 rounded-full bg-auth-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground"><Star className="h-3 w-3 fill-current" /> RECOMMANDÉ</span>
               <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-11 w-full rounded-xl border-auth-primary bg-auth-input text-foreground shadow-[0_0_18px_-9px_var(--auth-primary)] hover:bg-secondary hover:text-foreground">
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
           <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Pas encore de compte ?" : mode === "signup" ? "Déjà inscrit ?" : "Vous vous souvenez de votre mot de passe ?"}{" "}
             <Button variant="link" onClick={() => changeMode(mode === "login" ? "signup" : "login")} className="h-auto p-0 font-semibold text-auth-primary">
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </Button>
          </p>
          </div>
          <div className="mt-4 rounded-[20px] border border-dashed border-auth-dash bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <img src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
              <div><p className="text-sm font-semibold">Installer l'application</p><p className="text-xs text-auth-subtitle">Disponible Android</p></div>
            </div>
            <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl border-auth-primary bg-transparent text-sm font-bold text-auth-primary hover:bg-auth-primary/10 hover:text-auth-primary">
              <a href="/boostmada.apk" download="BoostMada.apk">
                <Download className="h-4 w-4" /> TÉLÉCHARGER APK
              </a>
            </Button>
          </div>
          <nav aria-label="Informations BoostMada" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link to="/a-propos" className="hover:text-primary">À propos</Link>
            <Link to="/faq" className="hover:text-primary">Questions fréquentes</Link>
            <Link to="/contact" className="hover:text-primary">Contacter le support</Link>
          </nav>
        </section>
      )}
       {!loading && !user && <AiAssistant orange />}
      {!loading && !user && showNotif && <div id="notif" role="dialog" aria-label="Installer l'application ?" className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 rounded-md border-l-4 border-primary bg-notice-background p-4 text-notice-foreground shadow-2xl sm:bottom-6">
        <div className="flex items-start justify-between gap-2"><h2 className="font-sans text-base font-bold">Installer l'application ?</h2><Button variant="ghost" size="icon" aria-label="Fermer" onClick={() => setShowNotif(false)} className="-mr-2 -mt-2 h-8 w-8 text-notice-foreground"><X className="h-4 w-4" /></Button></div>
         <p className="mt-1 text-sm">Ajoutez SMM B&amp;S à votre écran d'accueil.</p>
         <div className="mt-4 flex gap-2"><Button onClick={installApp} className="bg-primary text-primary-foreground hover:bg-primary/90">Installer</Button><Button variant="outline" onClick={() => setShowNotif(false)} className="border-border bg-notice-background text-notice-foreground hover:bg-muted">Plus tard</Button></div>
      </div>}
    </main>
  );
}
