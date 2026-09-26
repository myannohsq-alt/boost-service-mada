import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { useI18n, formatAr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const nav = [
  { to: "/", key: "home", label: "🏠 Accueil", public: true },
  { to: "/services", key: "services", label: "🛒 Services", public: false },
  { to: "/dashboard", key: "dashboard", label: "📊 Tableau de bord", public: false },
  { to: "/commandes", key: "myOrders", label: "📦 Suivi des commandes", public: false },
  { to: "/depot", key: "depositNav", label: "💰 Dépôt / Recharge", public: false },
  { to: "/groupe", key: "group", label: "👥 Groupe de discussion", public: false },
  { to: "/tutoriel", key: "tutorial", label: "📚 Tutoriel", public: false },
  { to: "/contact", key: "contact", label: "📞 Support", public: true },
] as const;

const userNav = [
  { to: "/commandes", label: "📦 Suivi des commandes" },
  { to: "/groupe", label: "👥 Groupe de discussion" },
  { to: "/tutoriel", label: "📚 Tutoriel" },
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
      {now ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
    </span>
  );
}

export function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[image:var(--gradient-neon)] text-lg text-primary-foreground shadow-[0_6px_18px_-8px_var(--color-primary)]">
      ⚡
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

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { profile, isAdmin, user, refresh } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [spin, setSpin] = useState(false);

  const [saver, setSaver] = useState(false);
  useEffect(() => {
    const on = window.localStorage.getItem("bsm-data-saver") === "1";
    setSaver(on);
    document.documentElement.classList.toggle("data-saver", on);
  }, []);
  const toggleSaver = () => {
    const next = !saver;
    setSaver(next);
    window.localStorage.setItem("bsm-data-saver", next ? "1" : "0");
    document.documentElement.classList.toggle("data-saver", next);
  };
  const shareSite = async () => {
    const url = window.location.origin;
    const data = { title: "BOOST SERVICE MADA", text: "Boostez vos réseaux sociaux - 100% Gasy", url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié !");
      }
    } catch {
      /* annulé */
    }
  };
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
                <p className="truncate text-[11px] text-muted-foreground">{profile?.name || "Membre"}</p>
                <p className="truncate text-xs font-bold bsm-neon-text">{formatAr(profile?.balance ?? 0)}</p>
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
            <button onClick={doRefresh} aria-label="Actualiser" className={`hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-sm sm:flex ${spin ? "animate-spin" : ""}`}>🔄</button>
            <button onClick={() => setLang(lang === "mg" ? "fr" : "mg")} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-sm sm:flex" aria-label="Langue">
              {lang === "mg" ? "🇲🇬" : "🇫🇷"}
            </button>
            <button onClick={toggle} className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border text-sm sm:flex" aria-label="Thème">
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
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
        <AnnouncementBar />
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside
            className="relative h-full w-72 overflow-y-auto border-r border-primary/30 bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isAdmin ? (
              <div className="mb-4 flex items-center gap-2">
                <Logo size={32} />
                <span className="font-display text-sm font-bold">BOOST SERVICE MADA</span>
              </div>
            ) : (
              <Link
                to={user ? "/profil" : "/auth"}
                onClick={() => setOpen(false)}
                className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-3"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--gradient-neon)] text-sm font-bold text-primary-foreground">
                    {initials.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold">{user ? profile?.name || "Profil" : "Se connecter"}</p>
                  <p className="text-xs font-bold bsm-neon-text">{formatAr(profile?.balance ?? 0)}</p>
                </div>
              </Link>
            )}
            <div className="flex flex-col gap-1">
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
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-secondary text-foreground" }}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <button onClick={shareSite} className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                    📤 Partager le site à un(e) ami(e)
                  </button>
                  <button
                    onClick={toggleSaver}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <span>📶 Économiser des données</span>
                    <span className={`relative h-5 w-9 rounded-full transition-colors ${saver ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all ${saver ? "left-[18px]" : "left-0.5"}`} />
                    </span>
                  </button>
                  <button
                    onClick={() => toast.info("L'application APK sera bientôt disponible 📱")}
                    className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    📲 Télécharger l'APK
                  </button>
                </>
              )}
              {user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setOpen(false);
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-destructive"
                >
                  🚪 Hivoaka
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <main className="pb-28">{children}</main>


      <div className="fixed bottom-4 right-4 z-30 flex flex-col gap-3">
        <a
          href="https://m.me/BOOST-SERVICE"
          target="_blank"
          rel="noreferrer"
          aria-label="Messenger"
          className="bsm-btn bsm-btn-gold !h-12 !w-12 !p-0 text-lg"
        >
          💬
        </a>
        <a
          href="https://wa.me/261375141025"
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="bsm-btn bsm-btn-ghost !h-12 !w-12 !p-0 text-lg"
        >
          📱
        </a>
      </div>

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
