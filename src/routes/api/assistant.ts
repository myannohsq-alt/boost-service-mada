import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient<Database>(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: u } = await sb.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });

        let body: { messages?: Msg[] };
        try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
        const history = (body.messages ?? [])
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-20)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
        if (!history.length) return new Response("Bad request", { status: 400 });

        const { data: services } = await sb
          .from("services")
          .select("platform,name_fr,name_mg,price,unit,delivery_time")
          .eq("active", true)
          .order("sort_order");
        const catalogue = (services ?? [])
          .map((s) => `- [${s.platform}] ${s.name_fr} / ${s.name_mg}: ${Math.ceil((Number(s.price) / s.unit) * 100)} Ar /100 (délai: ${s.delivery_time})`)
          .join("\n");

        const system = `Ianao no "Service IA" an'ny BOOST SERVICE MADA (boost réseaux sociaux, Madagascar).
Valio amin'ny teny Malagasy mifangaro Français, fohy, tena mahalala fomba ("tompoko"), haingana.
Catalogue & vidiny (Ariary):
${catalogue || "(tsy misy)"}
Fomba fanaovana commande: Services > safidio plateforme > tsindrio carte > apetraho lien https + quantité (min 100) > Commander. Esorina avy hatrany amin'ny solde ny vola, hita ao amin'ny "Suivi des commandes" ny statut.
Recharge solde: pejy "Dépôt / Recharge" > Orange Money, MVola na Airtel Money > alefa ny vola > soraty montant, numéro, référence SMS > Envoyer. Min 1 000 Ar, validation haingana.
Tutoriel: pejy "Tutoriel". Groupe de discussion: 1 Ar isaky ny message.
Réaction Mix Facebook = 👍 J'aime + ❤️ J'adore + 🥰 Solidaire zaraina mitovy.
Support: WhatsApp +261 37 51 410 25.
Ianao dia mpanampy marina: valio feno sy mazava ny fanontaniana rehetra (fomba fampiasana ny site, torohevitra hampitombo réseaux sociaux, fanazavana ankapobeny), manomeza dingana mazava. Ampiasao ny fiteny ampiasain'ny mpanjifa. Aza mamorona vidiny na fampanantenana tsy ao amin'ny catalogue. Ny olana manokana amin'ny kaonty na vola tsy tonga ihany no alefa any amin'ny Support WhatsApp.`;

        const fallback = () => {
          const q = (history[history.length - 1]?.content ?? "").toLowerCase();
          const list = (services ?? []);
          const price = (s: (typeof list)[number]) => `${Math.ceil((Number(s.price) / s.unit) * 100)} Ar /100`;
          let answer: string;
          const words = q.split(/[^a-zà-ÿ0-9]+/).filter((w) => w.length > 3);
          const hits = list.filter((s) => words.some((w) => `${s.platform} ${s.name_fr} ${s.name_mg}`.toLowerCase().includes(w)));
          if (/(recharge|depot|dépôt|mvola|airtel|orange|vola)/.test(q)) {
            answer = "Fomba fanaovana recharge tompoko 💰:\n1. Midira amin'ny pejy \"RECHARGE\".\n2. Safidio MVola (034 65 466 00 - MARODOLINX), Airtel (033 02 969 08 - MARODOLINX) na Orange (037 51 410 25 - ROLINE).\n3. Alefaso ny vola.\n4. Soraty ny montant, numéro ary référence SMS, dia tsindrio Envoyer.\nMinimum 1 000 Ar.";
          } else if (/(commande|commander|manafatra|baiko)/.test(q) && !hits.length) {
            answer = "Fomba fanaovana commande 🚀:\n1. Midira \"Services\".\n2. Safidio ny plateforme (Facebook, TikTok...).\n3. Tsindrio ny carte tianao.\n4. Apetaho ny lien https sy quantité (min 100).\n5. Tsindrio Commander. Esorina avy hatrany amin'ny solde ny vola.";
          } else if (/(suivi|statut|status|vita|tonga|delai|délai)/.test(q)) {
            answer = "Hitanao ao amin'ny \"Suivi des commandes\" ny statut-n'ny commande rehetra ⏱️. Matetika 15 min - 1h20 no vita. Raha mihoatra ny 24h, mifandraisa WhatsApp +261 37 51 410 25.";
          } else if (/(tuto|video|vidéo)/.test(q)) {
            answer = "Jereo ao amin'ny pejy \"Tutoriel\" ny vidéo maimaim-poana 🎬: compte, dépôt, commande, suivi.";
          } else if (hits.length) {
            answer = "Ireto ny tolotra mifanaraka tompoko 👇\n" + hits.slice(0, 8).map((s) => `• ${s.name_fr}: ${price(s)}`).join("\n") + "\nMidira \"Services\" hanaovana commande.";
          } else if (/(prix|vidiny|ohatrinona|tarif)/.test(q)) {
            answer = "Vidiny sasany 👇\n" + list.slice(0, 10).map((s) => `• [${s.platform}] ${s.name_fr}: ${price(s)}`).join("\n");
          } else if (/(salama|bonjour|manao ahoana|hello|salut)/.test(q)) {
            answer = "Salama tompoko 👋 Inona no azoko anampiana anao? (vidiny, commande, recharge, suivi, tutoriel)";
          } else {
            answer = "Afaka manampy anao momba ny vidiny, commande, recharge, suivi ary tutoriel aho tompoko 🙏. Soraty fohy ny fanontanianao (ohatra: \"followers TikTok\"). Raha olana manokana: WhatsApp +261 37 51 410 25.";
          }
          const ev = `data: ${JSON.stringify({ type: "response.output_text.delta", delta: answer })}\n\n`;
          return new Response(ev, { headers: { "Content-Type": "text/event-stream" } });
        };

        let res: Response;
        try {
          res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
            method: "POST",
            signal: request.signal,
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": process.env["LOVABLE_API_KEY"] ?? "",
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: "openai/gpt-6-astra",
              instructions: system,
              input: history,
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
              include: ["reasoning.encrypted_content"],
            }),
          });
        } catch {
          return fallback();
        }
        if (!res.ok || !res.body) return fallback();
        const headers = new Headers({ "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream" });
        res.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
        return new Response(res.body, { status: res.status, headers });
      },
    },
  },
});
