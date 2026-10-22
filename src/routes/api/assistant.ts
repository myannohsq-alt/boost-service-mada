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
            instructions: system,
            input: history,
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
        });
        const headers = new Headers({ "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream" });
        res.headers.forEach((v, k) => { if (k.toLowerCase().startsWith("x-lovable-aig-")) headers.set(k, v); });
        return new Response(res.body, { status: res.status, headers });
      },
    },
  },
});
