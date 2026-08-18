import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/useAuth";

export const LOCK_MESSAGE =
  "🔒 Veuillez créer un compte ou vous connecter pour accéder aux services et aux tarifs.";

export function MembersOnlyCard() {
  return (
    <section className="mx-auto w-full max-w-lg px-4 py-16 text-center">
      <div className="bsm-card p-8">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-4 font-display text-xl font-bold">Accès réservé aux membres</h1>
        <p className="mt-3 text-sm text-muted-foreground">{LOCK_MESSAGE}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link to="/auth" className="bsm-btn bsm-btn-primary">
            ✨ Créer un compte
          </Link>
          <Link to="/auth" className="bsm-btn bsm-btn-gold">
            🔑 Se connecter
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">
          Inscription gratuite • Accès immédiat aux tarifs, dépôt, recharge et commandes.
        </p>
      </div>
    </section>
  );
}

/** Wrap page content that is reserved for signed-in members. */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-24 text-center text-sm text-muted-foreground">Chargement…</div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <MembersOnlyCard />
      </Layout>
    );
  }

  return <>{children}</>;
}
