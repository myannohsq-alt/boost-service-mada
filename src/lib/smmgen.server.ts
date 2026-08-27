// SMMGen API v2 client (server-only).

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

async function call<T>(apiUrl: string, apiKey: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
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
  return json as T;
}

export function smmgen(apiUrl: string, apiKey: string) {
  return {
    services: () => call<SmmgenService[]>(apiUrl, apiKey, { action: "services" }),
    balance: () => call<{ balance: string; currency: string }>(apiUrl, apiKey, { action: "balance" }),
    add: (service: string, link: string, quantity: number) =>
      call<{ order: number | string }>(apiUrl, apiKey, {
        action: "add",
        service,
        link,
        quantity: String(quantity),
      }),
    status: (order: string) => call<SmmgenStatus>(apiUrl, apiKey, { action: "status", order }),
    multiStatus: (orders: string[]) =>
      call<Record<string, SmmgenStatus>>(apiUrl, apiKey, {
        action: "status",
        orders: orders.join(","),
      }),
  };
}

export function mapProviderStatus(raw: string | undefined): string {
  const s = (raw ?? "").toLowerCase();
  if (s === "completed") return "done";
  if (s === "canceled" || s === "cancelled" || s === "refunded") return "rejected";
  if (s === "partial") return "done";
  if (s === "pending") return "pending";
  return "processing";
}
