import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout, Logo } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search["ref"] === "string" ? (search["ref"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion & Inscription — BOOST SERVICE MADA" },
      {
        name: "description",
        content: "Créez votre compte BOOST SERVICE MADA avec votre nom, téléphone et mot de passe.",
      },
      { property: "og:title", content: "Connexion — BOOST SERVICE MADA" },
      { property: "og:description", content: "Accédez à votre compte et à votre solde." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { ref } = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState(ref ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) void navigate({ to: "/profil" });
  }, [user, navigate]);

  const submit = async () => {
    setMsg(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) return setMsg("❌ Numéro de téléphone invalide.");
    if (password.length < 6) return setMsg("❌ Mot de passe : 6 caractères minimum.");
    setBusy(true);
    const email = phoneToEmail(digits);

    if (mode === "signup") {
      if (name.trim().length < 2) {
        setBusy(false);
        return setMsg("❌ Entrez votre nom.");
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim(), phone: digits, referral_code: refCode.trim().toUpperCase() },
        },
      });
      setBusy(false);
      if (error) return setMsg(`❌ ${error.message}`);
      setMsg("✅ Compte créé ! Vous êtes connecté.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg("❌ Téléphone ou mot de passe incorrect.");
  };

  return (
    <Layout>
      <section className="mx-auto w-full max-w-md px-4 py-10">
        <div className="text-center">
          <div className="mx-auto w-fit animate-float">
            <Logo size={72} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">
            {mode === "login" ? "Connexion 🔐" : "Inscription 🚀"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Connexion sécurisée avec votre numéro de téléphone.
          </p>
        </div>

        <div className="bsm-card mt-6 space-y-3 p-5">
          {mode === "signup" ? (
            <div>
              <label className="text-xs text-muted-foreground">👤 Nom</label>
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                className="bsm-input mt-1"
              />
            </div>
          ) : null}
          <div>
            <label className="text-xs text-muted-foreground">📱 Téléphone</label>
            <input
              value={phone}
              inputMode="tel"
              maxLength={20}
              placeholder="034 00 000 00"
              onChange={(e) => setPhone(e.target.value)}
              className="bsm-input mt-1"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">🔒 Mot de passe</label>
            <input
              type="password"
              value={password}
              maxLength={72}
              onChange={(e) => setPassword(e.target.value)}
              className="bsm-input mt-1"
            />
          </div>
          {mode === "signup" ? (
            <div>
              <label className="text-xs text-muted-foreground">🎁 Code parrainage (optionnel)</label>
              <input
                value={refCode}
                maxLength={12}
                onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                className="bsm-input mt-1"
              />
            </div>
          ) : null}

          {msg ? <p className="rounded-lg bg-secondary p-3 text-sm">{msg}</p> : null}

          <button
            disabled={busy}
            onClick={submit}
            className="bsm-btn bsm-btn-primary w-full disabled:opacity-50"
          >
            {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMsg(null);
            }}
            className="w-full text-center text-xs text-muted-foreground underline"
          >
            {mode === "login" ? "Pas encore de compte ? Inscription" : "Déjà inscrit ? Connexion"}
          </button>
        </div>
      </section>
    </Layout>
  );
}
