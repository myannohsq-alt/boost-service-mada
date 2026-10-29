import { NotificationBell } from "@/components/NotificationBell";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { useI18n, formatAr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, Package, UsersRound, BookOpen, LogOut, Coins } from "lucide-react";
import { DisplayName } from "@/components/AdminBadge";

const nav = [
  { to: "/", key: "home", label: "🏠 Accueil", public: true },
  { to: "/services", key: "services", label: "🛒 Services", public: false },
  { to: "/dashboard", key: "dashboard", label: "📊 Tableau de bord", public: false },
  { to: "/commandes", key: "myOrders", label: "📦 Suivi des commandes", public: false },
  { to: "/depot", key: "depositNav", label: "💰 Dépôt / Recharge", public: false },
  { to: "/commentaires", key: "comments", label: "✨ Générateur de commentaires IA", public: false },
  { to: "/suivi-commentaires", key: "commentsTrack", label: "💬 Suivi des commentaires", public: false },
  { to: "/groupe", key: "group", label: "👥 Groupe de discussion", public: false },
  { to: "/tutoriel", key: "tutorial", label: "📚 Tutoriel", public: false },
  { to: "/mitady-vola", key: "mitady", label: "💸 MITADY VOLA", public: true },
  { to: "/contact", key: "contact", label: "📞 Support", public: true },
] as const;

const userNav = [
  { to: "/depot", icon: Wallet, label: "RECHARGE" },
  { to: "/commandes", icon: Package, label: "Suivi des commandes" },
  { to: "/groupe", icon: UsersRound, label: "Groupe de discussion" },
  { to: "/tutoriel", icon: BookOpen, label: "Tutoriel" },
  { to: "/mitady-vola", icon: Coins, label: "MITADY VOLA" },
] as const;

const ANNOUNCEMENTS = [
  "🔥 Midira ao am tutoriel izay ijer tuto 😎",
  "🚀 Tongasoa eto amin'ny BOOST SERVICE MADA",
  "💰 Ataovy dépôt aloha vao manao commande",
  "📦 Jereo ny commandes ao amin'ny compte-nao",
  "🎁 Misy promotion manokana androany",
  "❤️ Misaotra anao mampiasa BOOST SERVICE MADA",
];

export function Logo({ size = 44 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="Logo BOOST SERVICE MADA"
      width={size}
      height={size}
      className="drop-shadow-[0_0_18px_var(--color-primary)]"
      style={{ width: size, height: size }}
    />
  );
}

export function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground">
      {now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
    </span>
  );
}

export function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-mark text-primary shadow-[0_0_18px_-4px_var(--color-primary)]">
      <span aria-hidden="true">⚡</span>
    </span>
  );
}

function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((v) => (v + 1) % ANNOUNCEMENTS.length), 4000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="border-b border-primary/25 bg-gradient-to-r from-primary/15 via-transparent to-primary/15">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 overflow-hidden px-4 py-2">
        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          INFO
        </span>
        <p key={i} className="animate-slide-up truncate text-xs font-medium text-foreground/90">
          {ANNOUNCEMENTS[i]}
        </p>
      </div>
    </div>
  );
}

export function Layout({ children, hideAnnouncement = false }: { children: ReactNode; hideAnnouncement?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { profile, isAdmin, user, loading, refresh } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [spin, setSpin] = useState(false);

  const navLabel = (n: (typeof nav)[number]) => {
    if (n.key === "dashboard" || n.key === "group") return n.label;
    const translated = t(n.key);
    return translated === n.key ? n.label : n.label;
  };

  const doRefresh = async () => {
    setSpin(true);
    await Promise.all([refresh(), qc.invalidateQueries()]);
    window.setTimeout(() => setSpin(false), 600);
  };

  const initials = (profile?.name || profile?.email || "BSM").slice(0, 2).toUpperCase();

  const balance = Number(profile?.balance ?? 0);
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalance = useRef<number | null>(null);
  useEffect(() => {
    if (prevBalance.current === null || balance === prevBalance.current) {
      prevBalance.current = balance;
      return undefined;
    }
    prevBalance.current = balance;
    setBalanceFlash(true);
    const timer = window.setTimeout(() => setBalanceFlash(false), 1200);
    return () => window.clearTimeout(timer);
  }, [balance]);

  return (
    <div className="min-h-screen bsm-hero">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2">
          {user ? (
            <Link to="/profil" className="flex min-w-0 items-center gap-2">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-neon)] text-xs font-bold text-primary-foreground">
                  {initials.charAt(0)}
                </span>
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[11px] text-muted-foreground"><DisplayName name={profile?.name} admin={isAdmin} /></p>
                <p className={`truncate text-xs font-bold bsm-neon-text ${balanceFlash ? "bsm-balance-flash" : ""}`}>{formatAr(profile?.balance ?? 0)}</p>
              </div>
            </Link>
          ) : (
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <BrandMark />
              <span className="truncate text-[13px] font-bold sm:text-base">BOOST SERVICE MADA</span>
            </Link>
          )}

          <div className="flex justify-center">
            {user ? (
              <Link to="/" className="flex items-center gap-2">
                <BrandMark />
                <span className="hidden text-base font-bold md:inline">BOOST SERVICE MADA</span>
              </Link>
            ) : null}
            <LiveClock />
          </div>

          <div className="flex items-center justify-end gap-1.5">
            {user ? <NotificationBell /> : null}
            <button onClick={doRefresh} aria-label="Actualiser" className={`flex h-9 w-9 items-center justify-center rounded-xl border border-border text-sm ${spin ? "animate-spin" : ""}`}>🔄</button>
            <button onClick={() => setLang(lang === "mg" ? "fr" : "mg")} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-sm sm:flex" aria-label="Langue">
              {lang === "mg" ? "🇲🇬" : "🇫🇷"}
            </button>
            <button onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-sm" aria-label="Thème">
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            <Link to="/mitady-vola" className="hidden rounded-full border border-primary/60 px-3 py-1.5 text-xs font-semibold text-primary md:inline">MITADY VOLA</Link>
            {!user ? (
              <Link to="/auth" className="rounded-full border border-primary/60 px-3 py-1.5 text-xs font-semibold text-primary">
                {t("login")}
              </Link>
            ) : null}
            <button aria-label="Menu" onClick={() => setOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-neon)] text-primary-foreground">
              ☰
            </button>
          </div>
        </div>
        {!hideAnnouncement ? <AnnouncementBar /> : null}
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside
             aria-label="Menu principal"
             className="dark relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-4 text-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="mb-6 flex items-center justify-between gap-2 border-b border-border pb-4">
               <div className="flex min-w-0 items-center gap-2">
                 <Logo size={32} />
                 <span className="truncate font-display text-sm font-bold">BOOST SERVICE MADA</span>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="shrink-0 text-xl">×</Button>
             </div>
             <nav aria-label="Navigation principale" className="flex flex-col gap-1">
               {loading ? null : (
                 <>
              {isAdmin ? (
                <>
                  {nav.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-secondary text-foreground" }}
                    >
                      {navLabel(n)}
                    </Link>
                  ))}
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-gold"
                  >
                    🛡️ {t("admin")}
                  </Link>
                </>
              ) : (
                <>
                  {userNav.map((n) => (
                    <Link
                      key={n.to}
                      to={user ? n.to : "/auth"}
                      onClick={() => setOpen(false)}
                       className="flex min-h-14 items-center gap-4 rounded-md px-3 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       activeProps={{ className: "bg-secondary text-primary" }}
                    >
                       <n.icon aria-hidden="true" className="h-7 w-8 shrink-0 text-primary" strokeWidth={1.8} />
                       <span>{n.label}</span>
                    </Link>
                  ))}
                </>
              )}
              {user ? (
                 <Button
                   variant="ghost"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setOpen(false);
                  }}
                   className={isAdmin ? "mt-2 justify-start text-destructive" : "mt-1 min-h-14 justify-start gap-4 px-3 text-sm font-semibold text-foreground hover:bg-secondary"}
                >
                   {isAdmin ? <span aria-hidden="true">🚪</span> : <LogOut aria-hidden="true" className="h-7 w-8 shrink-0 text-primary" strokeWidth={1.8} />}
                   {isAdmin ? "Hivoaka" : "Déconnexion (Hivoaka)"}
                 </Button>
              ) : null}
                 </>
               )}
             </nav>
          </aside>
        </div>
      ) : null}

      <main className="pb-28">{children}</main>


      <footer className="border-t border-primary/20 bg-card/60 px-4 py-8 text-center text-xs text-muted-foreground">
        <Logo size={40} />
        <p className="mt-3 font-display text-sm font-bold text-foreground">BOOST SERVICE MADA 🇲🇬</p>
        <p className="mt-1">{t("slogan")}</p>
        <p className="mt-3">Messenger : BOOST &amp; SERVICE • WhatsApp : +261 37 51 410 25</p>
        <p className="mt-3">© {new Date().getFullYear()} BOOST SERVICE MADA</p>
      </footer>
    </div>
  );
}
