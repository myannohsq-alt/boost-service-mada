import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const LANGS: Record<string, string> = {
  gasy: "100% en malgache (teny Malagasy ofisialy sy fiteny andavanandro), AUCUN mot français",
  fr: "100% en français",
  mix: "en mélange naturel malgache + français, comme parlent les jeunes Malgaches sur Facebook",
};
const THEMES: Record<string, string> = {
  anniversaire: "anniversaire / fitsingerenan'ny andro nahaterahana",
  varotra: "vente / varotra (encourager, demander le prix, féliciter la qualité du produit)",
  felicitations: "félicitations / arahaba (réussite, examen, mariage, promotion)",
  custom: "sujet libre décrit par l'utilisateur",
};

export const Route = createFileRoute("/api/comments-generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });

        let body: { count?: number; lang?: string; theme?: string; topic?: string; avoid?: string[] };
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
        const count = Math.min(500, Math.max(1, Math.floor(Number(body.count) || 0)));
        const lang = LANGS[body.lang ?? ""] ? body.lang! : "gasy";
        const theme = THEMES[body.theme ?? ""] ? body.theme! : "custom";
        const topic = String(body.topic ?? "").slice(0, 300);
        const avoid = (body.avoid ?? []).slice(-60).map((s) => String(s).slice(0, 80));

        const instructions = `Tu génères des commentaires Facebook réalistes pour une publication malgache.
Règles :
- Exactement ${count} commentaires, UN par ligne, sans numérotation, sans tirets, sans guillemets, sans texte avant ou après.
- Tous UNIQUES (aucune répétition), courts (2 à 12 mots), naturels, variés, positifs, comme écrits par de vraies personnes.
- Langue : ${LANGS[lang]}.${lang === "gasy" ? ' Exemples de ton : "Arabaina e!", "Mirary soa be!", "Ho ela velona 🎉", "Tsara be ity".' : ""}
- Thème : ${THEMES[theme]}.
- Adapte-toi précisément à la publication décrite. Emojis permis avec modération.
- Pas de contenu offensant, pas de liens, pas de hashtags en masse.`;
        const input = `Publication : ${topic || "(non précisée)"}${avoid.length ? `\nN'utilise pas ces commentaires déjà générés :\n${avoid.join("\n")}` : ""}\n\nGénère maintenant ${count} commentaires.`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions,
            input,
            stream: true,
            store: false,
            reasoning: { effort: "low" },
          }),
        });
        const headers = new Headers({
          "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
        });
        res.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
        return new Response(res.body, { status: res.status, headers });
      },
    },
  },
});
