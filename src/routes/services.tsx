import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Layout } from "@/components/Layout";
import { AuthGate } from "@/components/AuthGate";
import { AiAssistant } from "@/components/AiAssistant";
import { OrderModal, type ServiceCard } from "@/components/OrderModal";
import { formatAr, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FACEBOOK_GASY_KEY, buildServiceGroups, type ServiceGroup } from "@/lib/service-groups";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services & Tarifs — BOOST SERVICE MADA" },
      {
        name: "description",
        content:
          "Tarifs Facebook, TikTok, Instagram et YouTube : réactions, followers, vues, commentaires et partages à petit prix en Ariary.",
      },
      { property: "og:title", content: "Services & Tarifs — BOOST SERVICE MADA" },
      { property: "og:description", content: "Tous nos services de boost réseaux sociaux en Ariary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServicesPage,
});

const platforms = [
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
];

function ServicesPage() {
  const { lang } = useI18n();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState("facebook");
  const [selected, setSelected] = useState<ServiceGroup | null>(null);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as unknown as ServiceCard[];
    },
  });

  const list = useMemo(
    () => buildServiceGroups((services ?? []).filter((s) => s.platform === platform && s.name_fr !== "Commentaires Gasy IA")),
    [services, platform],
  );

  const times = useDynamicTimes(list);
  const gasyTime = useGasyTime();

  return (
    <AuthGate>
      <Layout>
        <section className="mx-auto w-full max-w-5xl px-3 py-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">Services</h1>
              <p className="text-[11px] text-muted-foreground">Boostez vos réseaux sociaux — 100% Gasy 🇲🇬</p>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 text-[11px]">
              Solde <span className="font-bold bsm-neon-text">{formatAr(profile?.balance ?? 0)}</span>
            </span>
          </div>

          <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  platform === p.id
                    ? "bg-[image:var(--gradient-neon)] text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {list.map((g, i) => (
              <ServiceTile
                key={g.key}
                group={g}
                id={idFor(services ?? [], g)}
                name={lang === "mg" ? g.nameMg : g.nameFr}
                time={g.key === FACEBOOK_GASY_KEY ? gasyTime : times[g.key] || g.deliveryTime || formatMinutes(baseMinutes(g.deliveryTime))}
                chosen={chosenPct(g.key, i)}
                onClick={() => setSelected(g)}
              />
            ))}
            {!list.length ? (
              <p className="col-span-2 text-sm text-muted-foreground">Aucun service pour cette plateforme.</p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <OrderModal
            group={selected}
            onClose={() => setSelected(null)}
            onOrdered={() => {
              void qc.invalidateQueries({ queryKey: ["my-orders"] });
              void qc.invalidateQueries({ queryKey: ["dashboard"] });
            }}
          />
        ) : null}
        <AiAssistant />
      </Layout>
    </AuthGate>
  );
}

const ICONS: { test: RegExp; icon: string; tone: string }[] = [
  { test: /vue|view|lecture/i, icon: "👁️", tone: "bg-info/20" },
  { test: /partage|share/i, icon: "🔁", tone: "bg-success/15" },
  { test: /comment/i, icon: "💬", tone: "bg-[oklch(0.3_0.1_295)]" },
  { test: /follow|abonn|membre/i, icon: "👥", tone: "bg-accent" },
  { test: /like|j'aime|réaction|reaction/i, icon: "❤️", tone: "bg-destructive/20" },
  { test: /save|enregistr/i, icon: "📌", tone: "bg-gold/15" },
  { test: /protection|compte/i, icon: "🛡️", tone: "bg-info/20" },
];

function baseMinutes(txt: string): number {
  const nums = (txt.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
  if (!nums.length) return 90;
  const avg = nums.length > 1 ? (nums[0]! + nums[nums.length - 1]!) / 2 : nums[0]!;
  const isMin = /min/i.test(txt) && !/\bh\b|heure/i.test(txt);
  const isDay = /jour|day|\bj\b/i.test(txt);
  return Math.max(5, Math.round(avg * (isMin ? 1 : isDay ? 1440 : 60)));
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function getRandomTime(): string {
  // Random between 15 min and 1h20min (80 min)
  const m = 15 + Math.floor(Math.random() * 66);
  return formatMinutes(m);
}

const TIMES_KEY = "bsm_dynamic_times";
const TIMES_TS_KEY = "bsm_dynamic_times_ts";
const TWO_HOURS = 2 * 60 * 60 * 1000;

function useDynamicTimes(list: ServiceGroup[]) {
  const [times, setTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!list.length) return;

    const updateAllTimes = () => {
      const next: Record<string, string> = {};
      for (const g of list) next[g.key] = getRandomTime();
      setTimes(next);
      try {
        localStorage.setItem(TIMES_KEY, JSON.stringify(next));
        localStorage.setItem(TIMES_TS_KEY, String(Date.now()));
      } catch {
        /* storage unavailable */
      }
    };

    // On load: reuse stored times if they are less than 2h old
    let restored = false;
    try {
      const raw = localStorage.getItem(TIMES_KEY);
      const ts = Number(localStorage.getItem(TIMES_TS_KEY) ?? 0);
      if (raw && ts && Date.now() - ts < TWO_HOURS) {
        const stored = JSON.parse(raw) as Record<string, string>;
        const next: Record<string, string> = {};
        for (const g of list) next[g.key] = stored[g.key] ?? getRandomTime();
        setTimes(next);
        restored = true;
      }
    } catch {
      /* ignore */
    }
    if (!restored) updateAllTimes();

    // Re-generate all times every 2 hours
    const id = window.setInterval(updateAllTimes, TWO_HOURS);
    return () => window.clearInterval(id);
  }, [list]);

  return times;
}

const GASY_KEY = "bsm_gasy_time";
const FOUR_HOURS = 4 * 60 * 60 * 1000;
function useGasyTime() {
  const [t, setT] = useState("2h 44m");
  useEffect(() => {
    const gen = () => {
      const v = formatMinutes(120 + Math.floor(Math.random() * 90));
      setT(v);
      try { localStorage.setItem(GASY_KEY, JSON.stringify({ v, ts: Date.now() })); } catch { /* ignore */ }
    };
    try {
      const s = JSON.parse(localStorage.getItem(GASY_KEY) ?? "null") as { v: string; ts: number } | null;
      if (s && Date.now() - s.ts < FOUR_HOURS) setT(s.v); else gen();
    } catch { gen(); }
    const id = window.setInterval(gen, FOUR_HOURS);
    return () => window.clearInterval(id);
  }, []);
  return t;
}

function idFor(all: ServiceCard[], g: ServiceGroup): number {
  const first = g.options[0]?.service;
  const idx = first ? all.findIndex((s) => s.id === first.id) : -1;
  return 101 + Math.max(0, idx);
}

function chosenPct(key: string, i: number): number {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 997;
  return Math.max(42, 96 - i * 4 - (h % 12));
}

function ServiceTile({
  group, id, name, time, chosen, onClick,
}: {
  group: ServiceGroup; id: number; name: string; time: string; chosen: number; onClick: () => void;
}) {
  const ic = ICONS.find((x) => x.test.test(group.nameFr)) ?? { icon: "🚀", tone: "bg-secondary" };
  const base = baseMinutes(group.deliveryTime);
  const unavailable = /indispo/i.test(group.badge ?? "");
  const gasy = /gasy|malagasy|madagascar/i.test(`${group.nameFr} ${group.nameMg}`);
  const premium = group.key === FACEBOOK_GASY_KEY;
  const per100 = /réactions sur commentaires/i.test(group.nameFr) ? 1500 : Math.ceil(group.unitPrice * 100);

  return (
    <button
      onClick={onClick}
      disabled={unavailable}
      className="group relative flex w-full flex-col rounded-2xl border border-border bg-card p-[13px] text-left transition hover:border-primary hover:shadow-[0_0_22px_-10px_var(--color-primary)] active:scale-[0.98] disabled:opacity-60"
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${ic.tone}`}>{ic.icon}</span>
        <div className="flex flex-col items-end gap-1">
          {unavailable ? (
            <Badge className="bg-muted text-muted-foreground">INDISPONIBLE</Badge>
          ) : id === 101 ? (
            <Badge className="bg-gradient-to-r from-destructive to-primary text-primary-foreground">🔥 TOP</Badge>
          ) : (
            <Badge className="bg-success/15 text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-dot" />⚡ RAPIDE
            </Badge>
          )}
          {premium ? (<>
            <Badge className="bg-success/15 text-success">✅ PREMIUM</Badge>
            <Badge className="bg-gold/15 text-gold">⭐ HQ</Badge>
            <Badge className="bg-success/15 text-success">🛡️ STABLE</Badge>
            <Badge className="bg-secondary text-foreground">👤 Réels</Badge>
          </>) : group.options.some((o) => /GARANTI/i.test(o.service.note ?? "")) ? (
            <Badge className="bg-success/15 text-success">🛡️ STABLE</Badge>
          ) : null}
          {gasy && !premium ? <Badge className="bg-secondary text-foreground">🇲🇬 GASY</Badge> : null}
        </div>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[13.5px] font-bold leading-[1.2] text-foreground">{premium ? "🇲🇬 BOOST MALAGASY" : name}</p>
      <span className="mt-1.5 w-fit rounded-full border border-border bg-secondary px-2 py-0.5 text-[10.5px] text-muted-foreground">
        ID: {id}
      </span>
      <p className="my-1.5 line-clamp-2 text-[11.5px] text-muted-foreground">
        {premium ? "Qualité premium HQ, stable, avec photos" : group.note || (group.options.length > 1 ? group.options.map((o) => o.label).join(" · ") : group.category)}
      </p>

      <p className="text-base font-bold text-foreground">
        {formatAr(per100)} <span className="text-[11px] font-normal text-muted-foreground">/100</span>
      </p>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
          <span>Choisi</span>
          <span className="text-[11px] font-bold text-success">{chosen}%</span>
        </div>
        <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-[image:var(--gradient-neon)]" style={{ width: `${chosen}%` }} />
        </div>
      </div>

      <span className="mt-2.5 inline-flex w-fit items-center gap-1 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] text-success">
        🕒 {time}
      </span>
      {premium ? <span className="mt-1.5 text-[10.5px] text-success">✅ Stable - Support refill</span> : null}
      <span className="hidden">
      </span>
    </button>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${className}`}>
      {children}
    </span>
  );
}
