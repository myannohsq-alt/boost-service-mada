import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referral_code: string;
  referral_earnings: number;
  referred_by: string | null;
  created_at: string;
};

type Ctx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refresh: async () => {},
});

export const phoneToEmail = (phone: string) =>
  `u${phone.replace(/\D/g, "")}@boostmada.app`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile) ?? null);
    setIsAdmin(Boolean(roles?.some((r) => r.role === "admin")));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => {
        void load(s?.user?.id);
      }, 0);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user?.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    await load(session?.user?.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, isAdmin, loading, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
