import { createClient } from "@supabase/supabase-js";

// External "Depots" project (SMS forwarder). Publishable key is safe in the browser.
export const DEPOTS_URL = "https://evtqunguntgqddehikiy.supabase.co";
export const DEPOTS_KEY = "sb_publishable_fOwCy7GMe5cwjvn8mNYdow_xvAskjFn";

export type Depot = { id: number | string; message: string; montant: number; created_at: string };

let client: ReturnType<typeof createClient> | null = null;
export function depotsClient() {
  if (!client) {
    client = createClient(DEPOTS_URL, DEPOTS_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: "bsm-depots-ext" },
    });
  }
  return client;
}

/** Last 9 digits, used to match "034..." / "+26134..." inside SMS text. */
export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-9);
}

/** Columns may be capitalised (Message/Montant) — accept both. */
export function normDepot(r: Record<string, unknown>): Depot {
  const g = (k: string) => r[k] ?? r[k[0]!.toUpperCase() + k.slice(1)];
  return { id: g("id") as string, message: String(g("message") ?? ""), montant: Number(g("montant") ?? 0), created_at: String(g("created_at") ?? "") };
}

/**
 * Accept only SMS that look like official Orange Money receipts.
 * The forwarder stores only the text, so we require the receipt wording,
 * the new-balance line and a transaction reference together; a hand-typed
 * fake from a normal phone rarely carries all three, and it must also not
 * start with a personal phone number.
 */
export function isOfficialOrangeSms(message: string): boolean {
  const m = message.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/^\s*(\+?261|0)3[2-8]\d{7}/.test(m.replace(/\s/g, ""))) return false;
  const received = /(vous avez recu|avez recu|voaray|nahazo|transfert recu|depot recu)/.test(m);
  const balance = /(nouveau solde|solde actuel|votre solde|solde vaovao|solde\s*:)/.test(m);
  const ref = /(ref|trans(action)?\s*id|id\s*:|\b(ci|pp|mp|cp|tx)\d{5,}|\b\d{8,}\b.*\b[a-z]{2}\d{6,})/.test(m);
  return received && balance && ref;
}
