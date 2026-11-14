import { describe, it, expect } from "vitest";
import { verifyPapiSignature, rechargeIdFromRef, refFor } from "./papi-core";

// Official example from docs.papi.mg (securing notifications)
const secret = "pwhsec_5f1c2b7e9a0d4c3b8e6f1a2d9c7b4e0f3a6d8c1b5e9f2a7d4c0b3e6f9a1d8c2b";
const body = '{"paymentReference":"PAPI-TEST-0001","paymentStatus":"SUCCESS","amount":150000}';
const t = 1757750400;

async function sign(b: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${b}`));
  return [...new Uint8Array(s)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

describe("Papi signature", () => {
  it("accepts a valid signature", async () => {
    expect(await verifyPapiSignature(body, `t=${t},v1=${await sign(body)}`, secret, t + 10)).toBe(true);
  });
  it("rejects a tampered amount", async () => {
    const h = `t=${t},v1=${await sign(body)}`;
    expect(await verifyPapiSignature(body.replace("150000", "950000"), h, secret, t)).toBe(false);
  });
  it("rejects notifications older than 300 seconds", async () => {
    expect(await verifyPapiSignature(body, `t=${t},v1=${await sign(body)}`, secret, t + 301)).toBe(false);
  });
  it("rejects a missing header", async () => {
    expect(await verifyPapiSignature(body, null, secret, t)).toBe(false);
  });
  it("maps references back to the deposit", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(rechargeIdFromRef(refFor(id))).toBe(id);
    expect(rechargeIdFromRef("ORDER-1")).toBeNull();
  });
});
