import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
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
    const ref = localStorage.getItem("bsm_ref");
    if (ref && p && !(p as Profile).referred_by) {
      localStorage.removeItem("bsm_ref");
      void (supabase.rpc as any)("claim_referral", { _code: ref });
    } else if (ref) localStorage.removeItem("bsm_ref");
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

  // Mahita rehefa nekena ny dépôt: notification + animation + solde vaovao.
  const [celebrate, setCelebrate] = useState<number | null>(null);
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const key = `bsm_pending_recharges_${uid}`;
    let stop = false;
    const check = async () => {
      const { data } = await supabase
        .from("recharges")
        .select("id, amount, status")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(20);
      if (stop || !data) return;
      const prev: string[] = JSON.parse(localStorage.getItem(key) || "[]");
      const approved = data.filter((r) => prev.includes(r.id) && r.status === "approved");
      localStorage.setItem(key, JSON.stringify(data.filter((r) => r.status === "pending").map((r) => r.id)));
      if (approved.length) {
        const total = approved.reduce((s, r) => s + Number(r.amount), 0);
        await load(uid);
        setCelebrate(total);
        const { toast } = await import("sonner");
        toast.success(`🎉 Dépôt accepté : +${total.toLocaleString("fr-FR")} Ar`, {
          description: "Efa tafiditra ao amin'ny soldenao.",
        });
        if ("Notification" in window && Notification.permission === "granted") {
          try { new Notification("Dépôt accepté ✅", { body: `+${total.toLocaleString("fr-FR")} Ar ajouté à votre solde`, icon: "/icon-192.png" }); } catch { /* ignore */ }
        }
        setTimeout(() => setCelebrate(null), 3500);
      }
    };
    void check();
    const t = setInterval(() => void check(), 15000);
    return () => { stop = true; clearInterval(t); };
  }, [session?.user?.id]);

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, profile, isAdmin, loading, refresh }}
    >
      {children}
      {celebrate !== null && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-background/40 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-2xl border border-primary bg-card px-8 py-6 text-center shadow-2xl animate-in zoom-in-50 duration-500">
            <div className="text-5xl animate-bounce">🎉</div>
            <p className="mt-2 font-display text-lg font-bold text-foreground">Dépôt accepté !</p>
            <p className="text-2xl font-bold text-primary">+{celebrate.toLocaleString("fr-FR")} Ar</p>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
