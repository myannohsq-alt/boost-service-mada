// Minimal Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) using WebCrypto — works on Workers.
const enc = new TextEncoder();

function b64uDecode(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
function b64uEncode(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const x of u) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, len);
}

async function vapidHeader(endpoint: string, pub: string, priv: string) {
  const aud = new URL(endpoint).origin;
  const p = b64uDecode(pub);
  const jwk = { kty: "EC", crv: "P-256", d: priv, x: b64uEncode(p.slice(1, 33)), y: b64uEncode(p.slice(33, 65)) };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const h = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64uEncode(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:contact@boostmada.app" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${h}.${c}`));
  return `vapid t=${h}.${c}.${b64uEncode(sig)}, k=${pub}`;
}

async function encrypt(payload: string, p256dh: string, authSecret: string) {
  const uaPub = b64uDecode(p256dh);
  const auth = b64uDecode(authSecret);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPub = new Uint8Array((await crypto.subtle.exportKey("raw", local.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey("raw", uaPub as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const k = await crypto.subtle.importKey("raw", cek as BufferSource, "AES-GCM", false, ["encrypt"]);
  const plain = concat(enc.encode(payload), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, k, plain as BufferSource));
  const header = new Uint8Array(21 + asPub.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPub.length;
  header.set(asPub, 21);
  return concat(header, cipher);
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Returns HTTP status (404/410 = subscription gone). */
export async function sendWebPush(sub: PushSub, payload: object, pub: string, priv: string): Promise<number> {
  const body = await encrypt(JSON.stringify(payload), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(sub.endpoint, pub, priv),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: body as BodyInit,
  });
  return res.status;
}
