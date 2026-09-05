// SMMGen API v2 client (server-only).
// Every call is logged into public.api_logs, throttled, and retried with
// exponential backoff + jitter on 429 / 5xx (respecting Retry-After).

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

export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function isRateLimit(e: unknown): e is RateLimitError {
  if (e instanceof RateLimitError) return true;
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return m.includes("429") || m.includes("too many requests") || m.includes("trop de requ");
}

// --- client-side throttle: never fire two provider calls back to back -------
const MIN_GAP_MS = 1_500;
const MAX_RETRIES = 4;
let nextAllowedAt = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

async function throttle() {
  const wait = nextAllowedAt - Date.now();
  if (wait > 0) await sleep(wait);
  nextAllowedAt = Date.now() + MIN_GAP_MS;
}

function backoffMs(attempt: number, retryAfterSec: number | null) {
  if (retryAfterSec && retryAfterSec > 0) return Math.min(retryAfterSec * 1000, 60_000);
  const base = Math.min(2_000 * 2 ** attempt, 30_000);
  return base + Math.floor(Math.random() * 750);
}

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

async function markRateLimited(untilMs: number) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("provider_settings").select("id, rate_limit_hits").limit(1).maybeSingle();
    if (!row) return;
    await supabaseAdmin
      .from("provider_settings")
      .update({
        rate_limited_until: new Date(untilMs).toISOString(),
        rate_limit_hits: (row.rate_limit_hits ?? 0) + 1,
      })
      .eq("id", row.id);
  } catch {
    /* never break the cycle */
  }
}

async function call<T>(
  apiUrl: string,
  apiKey: string,
  params: Record<string, string>,
  ctx: LogCtx = {},
): Promise<T> {
  const action = params['action'] ?? "unknown";
  const safeRequest: Record<string, unknown> = { url: apiUrl, ...params };
  const body = new URLSearchParams({ key: apiKey, ...params });
  let lastError: unknown = new Error("SMMGen: échec inconnu");

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    await throttle();
    const started = Date.now();
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

      if (res.status === 429 || res.status >= 500) {
        const header = res.headers.get("retry-after");
        const retryAfterSec = header ? Number(header) : null;
        const delay = backoffMs(attempt, Number.isFinite(retryAfterSec) ? retryAfterSec : null);
        const message =
          res.status === 429
            ? `SMMGen: trop de requêtes (429), nouvelle tentative dans ${Math.round(delay / 1000)}s`
            : `SMMGen: erreur serveur ${res.status}`;
        await logCall({
          action,
          orderId: ctx.orderId,
          request: { ...safeRequest, attempt: attempt + 1 },
          response: { raw: text.slice(0, 500) },
          statusCode: status,
          ok: false,
          error: message,
          durationMs: Date.now() - started,
        });
        if (res.status === 429) await markRateLimited(Date.now() + delay);
        lastError =
          res.status === 429 ? new RateLimitError(message, delay) : new Error(message);
        if (attempt === MAX_RETRIES) break;
        nextAllowedAt = Date.now() + delay;
        continue;
      }

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
        action,
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
      if (e instanceof RateLimitError) throw e;
      const message = e instanceof Error ? e.message : String(e);
      await logCall({
        action,
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
  throw lastError;
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
