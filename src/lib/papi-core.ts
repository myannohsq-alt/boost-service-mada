// Pure helpers for Papi (no secrets, no I/O) — shared by server code and tests.
export const PAPI_BASE = "https://app.papi.mg/engine/api";
export const PAPI_PROVIDERS = { mvola: "MVOLA", orange: "ORANGE_MONEY", airtel: "AIRTEL_MONEY" } as const;
export const refFor = (rechargeId: string) => `BSM-${rechargeId}`;
export const rechargeIdFromRef = (ref: string) => {
  const m = /^BSM-([0-9a-f-]{36})$/i.exec(ref ?? "");
  return m ? m[1]!.toLowerCase() : null;
};

async function hmacHex(secret: string, msg: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verifies `X-Papi-Signature: t=<s>,v1=<hex>` per Papi docs (HMAC-SHA256 of `t.raw_body`, 300 s tolerance). */
export async function verifyPapiSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const item of header.split(",")) {
    const [k, ...rest] = item.trim().split("=");
    if (k) parts[k] = rest.join("=");
  }
  const t = parts["t"] ?? "", v1 = parts["v1"] ?? "";
  if (!/^\d+$/.test(t) || !/^[0-9a-f]{64}$/.test(v1)) return false;
  if (Math.abs(nowSec - Number(t)) > 300) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}
