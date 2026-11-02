import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC = "BJlOWE09UwuRIBnLw1kySn006gsS0RIalr0dbgj7M8L6-ThMdws2PtsW2ENku_E24zXuTHKr8XaGhM6K2r3G01o";
const DISMISS = "bsm_push_dismissed_at";

function keyBytes(s: string) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.self === window.top;

async function subscribe(userId: string) {
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("push_subscriptions").upsert({ user_id: userId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
}

/** Asks members to allow phone notifications and keeps their subscription fresh. */
export function PushOptIn() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !supported()) return;
    if (Notification.permission === "granted") { void subscribe(user.id).catch(() => {}); return; }
    if (Notification.permission === "denied") return;
    const last = Number(localStorage.getItem(DISMISS) || 0);
    if (Date.now() - last > 2 * 86400000) setShow(true);
  }, [user?.id]);

  if (!show || !user) return null;
  const enable = async () => {
    setShow(false);
    try {
      const p = await Notification.requestPermission();
      if (p !== "granted") { toast.error("Notifications refusées"); return; }
      await subscribe(user.id);
      toast.success("🔔 Notifications activées !");
    } catch { toast.error("Impossible d'activer les notifications sur cet appareil"); }
  };
  return (
    <div className="fixed inset-x-3 bottom-4 z-[60] mx-auto max-w-md animate-in slide-in-from-bottom-4 rounded-2xl border border-border bg-card p-3 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Bell className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Ampandrenesina ianao 🔔</p>
          <p className="text-xs text-muted-foreground">Mahazo fampandrenesana amin'ny finday: hafatra ao amin'ny Groupe, tolotra vaovao sy bonus.</p>
          <button onClick={enable} className="mt-2 rounded-full bg-gradient-to-r from-primary to-accent px-4 py-1.5 text-xs font-bold text-primary-foreground">Activer</button>
        </div>
        <button aria-label="Fermer" onClick={() => { localStorage.setItem(DISMISS, String(Date.now())); setShow(false); }} className="p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
