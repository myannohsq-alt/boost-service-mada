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
