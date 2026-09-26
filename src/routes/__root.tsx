import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/useAuth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ity pejy ity dia tsy misy na nafindra toerana.
        </p>
        <div className="mt-6">
          <Link to="/" className="bsm-btn bsm-btn-primary">
            🏠 Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Tsy nety ny fisokafan'ny pejy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Andramo averina na miverina any amin'ny fandraisana.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bsm-btn bsm-btn-primary"
          >
            Réessayer
          </button>
          <a href="/" className="bsm-btn bsm-btn-ghost">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "wSllX6bT4_jun7-zAhcB28IXXjJUN4y-R-WH5BqGVEA" },
      { title: "BoostMada - Boost Facebook TikTok Instagram 100% Gasy | boostmada.app" },
      {
        name: "description",
        content:
          "Boostez vos réseaux sociaux 100% Gasy. Likes, Followers, Vues, Commentaires IA Gasy. Paiement MVola Orange Money Airtel. Livraison rapide Madagascar.",
      },
      { name: "author", content: "BoostMada" },
      { property: "og:site_name", content: "BoostMada" },
      { property: "og:locale", content: "fr_MG" },
      { property: "og:title", content: "BoostMada - Boost Facebook TikTok Instagram 100% Gasy" },
      {
        property: "og:description",
        content:
          "Boostez vos réseaux sociaux 100% Gasy. Likes, Followers, Vues, Commentaires IA Gasy. Paiement MVola Orange Money Airtel. Livraison rapide Madagascar.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://boostmada.app/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "BoostMada - Boost Facebook TikTok Instagram 100% Gasy" },
      {
        name: "twitter:description",
        content:
          "Boostez vos réseaux sociaux 100% Gasy. Likes, Followers, Vues, Commentaires IA Gasy. Madagascar.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800&family=Outfit:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            {/* Required: nested routes render here. */}
            <Outlet />
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
