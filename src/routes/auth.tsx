import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mail, LockKeyhole, Download, ArrowRight, Eye, EyeOff, User, UserPlus, Smartphone, ShieldCheck, Zap, Headphones, Users, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
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
const phoneEmail = (raw: string) => {
  const d = raw.replace(/\D/g, "").replace(/^261/, "0");
  return /^03\d{8}$/.test(d) ? `${d}@mobile.boostmada.app` : null;
};
const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-border bg-auth-input px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-auth-primary focus:ring-2 focus:ring-auth-primary/30";

export function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"mobile" | "google">("mobile");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [accept, setAccept] = useState(true);
  const { theme, toggle } = useTheme();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);


  const installApp = async () => {
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
    if (mode !== "forgot" && !accept) return setMsg("❌ Acceptez les conditions d'utilisation.");
    const byPhone = mode === "signup" && method === "mobile";
    const typed = (byPhone ? phone : email).trim().toLowerCase();
    const mail = byPhone || (mode === "login" && !typed.includes("@")) ? phoneEmail(typed) ?? "" : typed;
    if (byPhone && !mail) return setMsg("❌ Numéro Mobile Money invalide (ex: 034 12 345 67).");
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setMsg("❌ Email ou numéro invalide.");

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
      const parts = fullName.trim().split(/\s+/);
      if (fullName.trim().length < 2) return setMsg("❌ Entrez votre nom et prénom.");
      const lastName = parts[0] ?? "";
      const firstName = parts.slice(1).join(" ") || lastName;
      setBusy(true);
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/services`,
          data: {
            name: fullName.trim(),
            ...(byPhone ? { phone: mail.split("@")[0] } : {}),
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
    if (error) return setMsg("❌ Identifiant ou mot de passe incorrect.");
    void navigate({ to: "/services", replace: true });
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setMsg(null);
  };

  const Field = ({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) => (
    <label className="block text-sm font-medium text-foreground">
      <span className="mb-1.5 flex items-center gap-2"><Icon aria-hidden="true" className="h-4 w-4 text-gold" />{label}</span>
      <span className="relative block"><Icon aria-hidden="true" className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gold" />{children}</span>
    </label>
  );
  const inCls = "h-12 w-full rounded-full border border-border bg-auth-input pl-12 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-2 focus:ring-gold/30";

  const googleBtn = (
    <Button type="button" variant="outline" disabled={busy} onClick={google} className="h-12 w-full rounded-full border-border bg-card text-base font-semibold text-foreground shadow-md hover:bg-secondary hover:text-foreground">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C36.9 40.3 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
      </svg>
      Continuer avec Google
    </Button>
  );
  const divider = <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground"><span className="h-px flex-1 bg-border" />OU<span className="h-px flex-1 bg-border" /></div>;
  const pwField = mode !== "forgot" && (
    <Field icon={LockKeyhole} label="Mot de passe">
      <input required type={showPw ? "text" : "password"} value={password} minLength={6} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="••••••••" onChange={(e) => setPassword(e.target.value)} className={inCls} />
      <button type="button" aria-label={showPw ? "Masquer" : "Afficher"} onClick={() => setShowPw((v) => !v)} className="absolute right-4 top-3.5 text-muted-foreground">{showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
    </Field>
  );

  return (
    <main className="relative flex min-h-screen items-start justify-center bg-background px-4 py-6 text-foreground sm:items-center">
      <button type="button" onClick={toggle} aria-label="Changer le thème" className="fixed right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md">
        {theme === "dark" ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5 text-primary" />}
      </button>
      {loading || user ? (
        <span className="text-sm text-muted-foreground">Chargement…</span>
      ) : (
        <section className="relative z-10 w-full max-w-[420px]" aria-label="Connexion BoostMada">
          <header className="mb-5 text-center">
            <img src="/icon-192.png" alt="SMM B&S — BOOST SERVICE MADA" width={112} height={112} fetchPriority="high" className="mx-auto h-28 w-28 rounded-full object-contain shadow-[0_0_40px_-8px_var(--color-primary)]" />
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground ring-4 ring-gold/30"><User className="h-7 w-7 fill-current" /></span>
              <h1 className="text-left font-sans text-2xl font-extrabold leading-tight">
                {mode === "signup" ? "Inscription" : mode === "forgot" ? "Mot de passe oublié" : <>Déjà client ?<br /><span className="text-primary">Connectez-vous</span></>}
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signup" ? "Choisissez une méthode pour créer votre compte" : mode === "forgot" ? "Recevez un lien de réinitialisation par email." : "Accédez à votre compte et continuez à booster votre visibilité."}
            </p>
          </header>

          {mode === "signup" && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {([["mobile", "Par Mobile Money"], ["google", "Par compte Google"]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => { setMethod(k); setMsg(null); }} className={`flex h-12 items-center justify-center gap-2 rounded-full border text-[11px] font-bold uppercase shadow-md sm:text-xs ${method === k ? "border-gold bg-gold text-gold-foreground" : "border-border bg-card text-foreground"}`}>
                  {k === "mobile" ? <Smartphone className="h-5 w-5" /> : <span className="font-black text-info">G</span>}{l}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-[24px] border border-primary/40 bg-card p-5 shadow-[0_18px_48px_-24px_var(--color-primary)]">
            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && method === "google" && <>{googleBtn}{divider}</>}
              {mode === "signup" && method === "mobile" ? (
                <Field icon={Smartphone} label="Numéro Mobile Money">
                  <input required value={phone} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="Ex: 034 12 345 67" onChange={(e) => setPhone(e.target.value)} className={inCls} />
                </Field>
              ) : (
                <Field icon={Mail} label={mode === "login" ? "Email ou numéro" : "Email"}>
                  <input required value={email} type={mode === "login" ? "text" : "email"} autoComplete="username" maxLength={120} placeholder="vous@email.com" onChange={(e) => setEmail(e.target.value)} className={inCls} />
                </Field>
              )}
              {mode === "signup" && (
                <Field icon={User} label="Votre nom et prénom">
                  <input required maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" className={inCls} />
                </Field>
              )}
              {pwField}
              {mode !== "forgot" && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
                  <span>J'accepte les <Link to="/a-propos" className="text-info underline">conditions d'utilisation</Link> et la <Link to="/a-propos" className="text-info underline">politique de confidentialité</Link></span>
                </label>
              )}
              {refCode && mode === "signup" && <p className="text-xs text-muted-foreground">Code parrainage : {refCode}</p>}
              {msg && <p role="status" className="rounded-md bg-secondary p-3 text-sm">{msg}</p>}
              <Button disabled={busy} type="submit" className="auth-primary-button h-12 w-full rounded-full text-base font-bold uppercase hover:opacity-90">
                {mode === "signup" ? <UserPlus className="h-5 w-5" /> : mode === "login" ? <ArrowRight className="h-5 w-5" /> : null}
                {busy ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : mode === "signup" ? "S'inscrire" : "Envoyer le lien"}
              </Button>
              {mode === "login" && <>{divider}{googleBtn}</>}
            </form>
            {mode === "login" && (
              <Button variant="link" onClick={() => changeMode("forgot")} className="mt-2 h-auto w-full justify-end px-0 text-info">Mot de passe oublié ?</Button>
            )}
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Vous n'avez pas de compte ?" : "Déjà un compte ?"}{" "}
              {mode !== "login" && <Button variant="link" onClick={() => changeMode("login")} className="h-auto p-0 font-semibold text-primary">Se connecter</Button>}
            </p>
          </div>

          {mode === "login" && (
            <Button variant="outline" onClick={() => changeMode("signup")} className="mt-5 h-12 w-full rounded-full border-2 border-info/60 bg-card text-base font-bold uppercase text-info shadow-md hover:bg-secondary hover:text-info">
              <UserPlus className="h-5 w-5" /> S'inscrire
            </Button>
          )}
          <Button asChild variant="outline" className="mt-3 h-12 w-full rounded-full border-2 border-gold/70 bg-card text-base font-bold text-foreground shadow-md hover:bg-secondary hover:text-foreground">
            <a href="/boostmada.apk" download="BoostMada.apk"><Download className="h-5 w-5 text-gold" /> TÉLÉCHARGER APK</a>
          </Button>
          {installPrompt && <Button variant="link" onClick={installApp} className="mt-1 h-auto w-full text-xs text-muted-foreground">Ajouter à l'écran d'accueil</Button>}

          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-gold" />100% Sécurisé</li>
            <li className="flex items-center gap-1"><Zap className="h-4 w-4 text-gold" />Rapide</li>
            <li className="flex items-center gap-1"><Headphones className="h-4 w-4 text-info" />Support 24/7</li>
            <li className="flex items-center gap-1"><Users className="h-4 w-4 text-primary" />Communauté Gasy</li>
          </ul>
          <nav aria-label="Informations BoostMada" className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <Link to="/a-propos" className="hover:text-primary">À propos</Link>
            <Link to="/faq" className="hover:text-primary">Questions fréquentes</Link>
            <Link to="/contact" className="hover:text-primary">Contacter le support</Link>
          </nav>
        </section>
      )}
      {!loading && !user && <AiAssistant orange />}
    </main>
  );
}
