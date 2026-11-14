import { createFileRoute } from "@tanstack/react-router";
import { verifyPapiSignature } from "@/lib/papi-core";

export const Route = createFileRoute("/api/public/papi-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifyPapiSignature(raw, request.headers.get("x-papi-signature"), process.env["PAPI_WEBHOOK_SECRET"] ?? "");
        if (!ok) return new Response("Invalid signature", { status: 401 });
        let ref = "";
        try { ref = String((JSON.parse(raw) as { merchantPaymentReference?: unknown }).merchantPaymentReference ?? ""); } catch { return new Response("Bad body", { status: 400 }); }
        const { settlePapiPayment } = await import("@/lib/papi.server");
        const out = await settlePapiPayment(ref);
        return Response.json({ received: true, state: out.state });
      },
    },
  },
});
