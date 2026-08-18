import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import logo from "@/assets/logo.png";
import { useI18n, formatAr } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", key: "home", label: "🏠 Accueil", public: true },
  { to: "/a-propos", key: "about", label: "ℹ️ À propos", public: true },
  { to: "/services", key: "services", label: "🛒 Services", public: false },
  { to: "/depot", key: "depositNav", label: "💳 Dépôt", public: false },
  { to: "/recharge", key: "recharge", label: "🔋 Recharge", public: false },
  { to: "/commandes", key: "myOrders", label: "📦 Mes commandes", public: false },
  { to: "/profil", key: "profile", label: "👤 Profil", public: false },
  { to: "/parrainage", key: "referral", label: "🎁 Parrainage", public: false },
  { to: "/actualites", key: "news", label: "📰 Actualités", public: false },
  { to: "/promotions", key: "promotions", label: "🔥 Promotions", public: false },
  { to: "/tutoriel", key: "tutorial", label: "🎬 Tutoriels", public: false },
  { to: "/protection", key: "protection", label: "🛡️ Protection", public: false },
  { to: "/avis", key: "reviews", label: "⭐ Avis", public: false },
  { to: "/faq", key: "faq", label: "❓ FAQ", public: true },
  { to: "/contact", key: "contact", label: "📞 Contact", public: true },
] as const;


export function Logo({ size = 44 }: { size?: number }) {
  return (
    <img
      src={logo}
      alt="Logo BOOST SERVICE MADA"
      width={size}
      height={size}
      className="drop-shadow-[0_0_18px_oklch(0.86_0.26_152_/_0.5)]"
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

export function Layout({ children }: { children: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { profile, isAdmin, user } = useAuth();
  const [open, setOpen] = useState(false);

  const visibleNav = user ? nav : nav.filter((n) => n.public);
  const navLabel = (n: (typeof nav)[number]) => (n.key === "about" ? n.label : t(n.key));


  return (
    <div className="min-h-screen bsm-hero">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <button
            aria-label="Menu"
            onClick={() => setOpen(true)}
            className="bsm-btn bsm-btn-ghost !px-3 !py-2 lg:hidden"
          >
            ☰
          </button>
          <Link to="/" className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-display text-sm font-bold leading-tight sm:text-base">
              <span className="bsm-neon-text">BOOST</span> SERVICE{" "}
              <span className="text-gold">MADA</span> 🇲🇬
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {visibleNav.slice(0, 6).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {navLabel(n)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <button
              onClick={() => setLang(lang === "mg" ? "fr" : "mg")}
              className="bsm-btn bsm-btn-ghost !px-3 !py-1.5 !text-xs"
              aria-label="Langue"
            >
              {lang === "mg" ? "🇲🇬 MG" : "🇫🇷 FR"}
            </button>
            <button
              onClick={toggle}
              className="bsm-btn bsm-btn-ghost !px-3 !py-1.5 !text-xs"
              aria-label="Thème"
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            {user ? (
              <Link to="/profil" className="bsm-btn bsm-btn-primary !px-3 !py-1.5 !text-xs">
                {formatAr(profile?.balance ?? 0)}
              </Link>
            ) : (
              <Link to="/auth" className="bsm-btn bsm-btn-primary !px-3 !py-1.5 !text-xs">
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
          <aside
            className="relative h-full w-72 overflow-y-auto border-r border-border bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-2">
              <Logo size={32} />
              <span className="font-display text-sm font-bold">BOOST SERVICE MADA</span>
            </div>
            <div className="flex flex-col gap-1">
              {visibleNav.map((n) => (
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
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-gold"
                >
                  {t("admin")}
                </Link>
              ) : null}
              {user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setOpen(false);
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-destructive"
                >
                  🚪 {t("logout")}
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
          className="bsm-btn bsm-btn-primary animate-pulse-ring !h-12 !w-12 !p-0 text-lg"
        >
          💬
        </a>
        <a
          href="https://wa.me/261375141025"
          target="_blank"
          rel="noreferrer"
          aria-label="WhatsApp"
          className="bsm-btn bsm-btn-gold !h-12 !w-12 !p-0 text-lg"
        >
          📱
        </a>
      </div>

      <footer className="border-t border-border bg-card/60 px-4 py-8 text-center text-xs text-muted-foreground">
        <Logo size={40} />
        <p className="mt-3 font-display text-sm font-bold text-foreground">BOOST SERVICE MADA 🇲🇬</p>
        <p className="mt-1">{t("slogan")}</p>
        <p className="mt-3">Messenger : BOOST &amp; SERVICE • WhatsApp : +261 37 51 410 25</p>
        <p className="mt-3">© {new Date().getFullYear()} BOOST SERVICE MADA</p>
      </footer>
    </div>
  );
}
