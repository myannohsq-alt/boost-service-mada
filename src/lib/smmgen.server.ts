// SMMGen API v2 client (server-only). Every call is logged into public.api_logs.

export type SmmgenService = {
  service: string | number;
  name: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: string | number;
  max: string | number;
};

export type SmmgenStatus = {
  charge?: string;
  start_count?: string | number;
  status?: string;
  remains?: string | number;
  currency?: string;
  error?: string;
};

type LogCtx = { orderId?: string | undefined };

async function logCall(entry: {
  action: string;
  orderId?: string | undefined;
  request: Record<string, unknown>;
  response: unknown;
  statusCode: number | null;
  ok: boolean;
  error: string;
  durationMs: number;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("api_logs").insert({
      provider: "SMMGen",
      action: entry.action,
      order_id: entry.orderId ?? null,
      request: entry.request as never,
      response: (typeof entry.response === "string"
        ? { raw: entry.response.slice(0, 2000) }
        : (entry.response as never)) ?? ({} as never),
      status_code: entry.statusCode,
      ok: entry.ok,
      error: entry.error.slice(0, 500),
      duration_ms: entry.durationMs,
    });
  } catch {
    /* logging must never break the sync cycle */
  }
}

async function call<T>(
  apiUrl: string,
  apiKey: string,
  params: Record<string, string>,
  ctx: LogCtx = {},
): Promise<T> {
  const started = Date.now();
  const body = new URLSearchParams({ key: apiKey, ...params });
  const safeRequest: Record<string, unknown> = { url: apiUrl, ...params };
  let status: number | null = null;
  let text = "";
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    status = res.status;
    text = await res.text();
    if (!res.ok) throw new Error(`SMMGen HTTP ${res.status}: ${text.slice(0, 300)}`);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`SMMGen: réponse non JSON: ${text.slice(0, 300)}`);
    }
    if (json && typeof json === "object" && "error" in json && (json as { error?: string }).error) {
      throw new Error(`SMMGen: ${(json as { error: string }).error}`);
    }
    await logCall({
      action: params['action'] ?? "unknown",
      orderId: ctx.orderId,
      request: safeRequest,
      response: Array.isArray(json) ? { count: json.length } : json,
      statusCode: status,
      ok: true,
      error: "",
      durationMs: Date.now() - started,
    });
    return json as T;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logCall({
      action: params['action'] ?? "unknown",
      orderId: ctx.orderId,
      request: safeRequest,
      response: { raw: text.slice(0, 2000) },
      statusCode: status,
      ok: false,
      error: message,
      durationMs: Date.now() - started,
    });
    throw e;
  }
}

export function smmgen(apiUrl: string, apiKey: string) {
  return {
    services: () => call<SmmgenService[]>(apiUrl, apiKey, { action: "services" }),
    balance: () => call<{ balance: string; currency: string }>(apiUrl, apiKey, { action: "balance" }),
    add: (service: string, link: string, quantity: number, orderId?: string) =>
      call<{ order: number | string; charge?: string | number }>(
        apiUrl,
        apiKey,
        { action: "add", service, link, quantity: String(quantity) },
        { orderId },
      ),
    status: (order: string) => call<SmmgenStatus>(apiUrl, apiKey, { action: "status", order }),
    multiStatus: (orders: string[]) =>
      call<Record<string, SmmgenStatus>>(apiUrl, apiKey, {
        action: "status",
        orders: orders.join(","),
      }),
  };
}

// Local status is derived ONLY from the provider status: never mark an order
// "done" unless SMMGen itself reports Completed (or Partial, which is final).
export function mapProviderStatus(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "completed") return "done";
  if (s === "partial") return "done";
  if (s === "canceled" || s === "cancelled" || s === "refunded") return "rejected";
  if (s === "pending") return "pending";
  if (s === "in progress" || s === "processing" || s === "inprogress") return "processing";
  if (s === "fail" || s === "failed" || s === "error") return "failed";
  return "processing";
}
