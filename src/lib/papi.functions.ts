import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAPI_BASE, PAPI_PROVIDERS, refFor } from "@/lib/papi-core";

export const createPapiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    amount: z.number().int().min(1000).max(2_000_000),
    method: z.enum(["mvola", "orange", "airtel"]),
    origin: z.string().url(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const key = process.env["PAPI_API_KEY"];
    if (!key) throw new Error("Paiement automatique indisponible");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    const id = crypto.randomUUID();
    const reference = refFor(id);
    const { error } = await supabaseAdmin.from("recharges").insert({
      id, user_id: context.userId, amount: data.amount, method: data.method, reference, sender_phone: "PAPI", status: "pending",
    });
    if (error) throw new Error("Impossible de créer le dépôt");
    const origin = new URL(data.origin).origin;
    const res = await fetch(`${PAPI_BASE}/payment-links`, {
      method: "POST",
      headers: { Token: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: data.amount, reference,
        clientName: String((prof as any)?.full_name || (prof as any)?.username || "Client SMM B&S").slice(0, 80),
        description: `Dépôt SMM B&S ${data.amount} Ar`,
        successUrl: `${origin}/depot?papi=${reference}`, failureUrl: `${origin}/depot?papi=${reference}`,
        notificationUrl: `${origin}/api/public/papi-webhook`,
        validDuration: 1, provider: PAPI_PROVIDERS[data.method],
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { data?: { paymentLink?: string }; error?: { message?: string } };
    if (!res.ok || !j.data?.paymentLink) {
      await supabaseAdmin.from("recharges").update({ status: "rejected" }).eq("id", id).eq("status", "pending");
      throw new Error(j.error?.message || "Papi indisponible, utilisez le dépôt manuel");
    }
    return { reference, paymentLink: j.data.paymentLink };
  });

export const checkPapiPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ reference: z.string().regex(/^BSM-[0-9a-f-]{36}$/i) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r } = await supabaseAdmin.from("recharges").select("user_id").eq("reference", data.reference).maybeSingle();
    if (!r || r.user_id !== context.userId) return { state: "unknown" as const };
    const { settlePapiPayment } = await import("@/lib/papi.server");
    return settlePapiPayment(data.reference);
  });
