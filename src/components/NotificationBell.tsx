import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Two encouragement messages per day, same for every user (rotates by date).
const POOL = [
  { title: "💰 Ataovy ny dépôt anao androany!", body: "Recharge haingana amin'ny MVola, Airtel na Orange dia manomboha boost avy hatrany 🚀", to: "/depot" },
  { title: "💬 Miresaha ao amin'ny Groupe!", body: "Zarao ny vokatrao, mametraha fanontaniana ary mifanampia amin'ny mpikambana hafa 🤝", to: "/groupe" },
  { title: "🎁 Asaivo ny namanao!", body: "Alefaso amin'ny namanao ny rohy fanasanao ao amin'ny Profil — fifanampiana no hery 💪", to: "/profil" },
  { title: "🔥 Boosté ny pejinao androany", body: "Ataovy dépôt kely dia hitombo haingana ny followers sy réactions-nao ⚡", to: "/depot" },
  { title: "👥 Misy resaka vaovao ao amin'ny Groupe", body: "Midira dia ampio na anontanio ireo mpikambana hafa 💬", to: "/groupe" },
  { title: "🤝 Zarao amin'ny namana", body: "Invitation iray = fanampiana iray. Alefaso ny rohinao amin'ny Facebook sy WhatsApp 📲", to: "/profil" },
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function dailyMessages() {
  const d = new Date();
  const day = Math.floor(d.getTime() / 86400000);
  const a = POOL[(day * 2) % POOL.length];
  const b = POOL[(day * 2 + 1) % POOL.length];
  return [a, b];
}

const SEEN_NOTIF = "bsm_notif_seen_day";
const SEEN_CHAT = "bsm_chat_seen_at";

export function NotificationBell() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  // Mark group as seen when visiting it
  useEffect(() => {
    if (location.pathname.startsWith("/groupe")) {
      localStorage.setItem(SEEN_CHAT, new Date().toISOString());
      setChatUnread(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    setNotifUnread(localStorage.getItem(SEEN_NOTIF) === todayKey() ? 0 : 2);
    let alive = true;
    const load = async () => {
      if (location.pathname.startsWith("/groupe")) return;
      const since = localStorage.getItem(SEEN_CHAT) ?? new Date(Date.now() - 86400000).toISOString();
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .gt("created_at", since);
      if (alive) setChatUnread(count ?? 0);
    };
    void load();
    const ch = supabase
      .channel("bell-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => void load())
      .subscribe();
    const iv = window.setInterval(load, 60000);
    return () => { alive = false; window.clearInterval(iv); void supabase.removeChannel(ch); };
  }, [location.pathname]);

  const total = chatUnread + notifUnread;

  // Number on the app icon (installed app)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (total > 0) nav.setAppBadge?.(total).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [total]);

  const openPanel = () => {
    setOpen(true);
    localStorage.setItem(SEEN_NOTIF, todayKey());
    setNotifUnread(0);
  };

  return (
    <>
      <button onClick={openPanel} aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-sm">
        🔔
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1 text-center text-[10px] font-bold leading-[18px] text-destructive-foreground">
            {total > 99 ? "99+" : total}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 p-3 pt-16 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">🔔 Fampandrenesana</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground" aria-label="Fermer">✕</button>
            </div>
            <div className="space-y-2">
              {chatUnread > 0 ? (
                <Link to="/groupe" onClick={() => setOpen(false)} className="block rounded-xl border border-primary/50 bg-primary/10 p-3">
                  <p className="text-sm font-semibold">💬 {chatUnread} hafatra vaovao ao amin'ny Groupe</p>
                  <p className="text-xs text-muted-foreground">Tsindrio hamaky azy</p>
                </Link>
              ) : null}
              {dailyMessages().map((m) => (
                <Link key={m.title} to={m.to} onClick={() => setOpen(false)} className="block rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
