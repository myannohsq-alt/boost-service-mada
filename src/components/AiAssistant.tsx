import { useEffect, useRef, useState } from "react";

type Msg = { role: "ai" | "me"; text: string };

const WELCOME =
  "🤖 Salama! Izaho no Service IA an'ny BOOST SERVICE MADA. Anontanio aho momba ny dépôt, commande, servisy na tutoriel.";

const QUICK = [
  { label: "💰 Ahoana no hanaovana dépôt ?", key: "depot" },
  { label: "📦 Ahoana no hanaovana commande ?", key: "commande" },
  { label: "📚 Tutoriel", key: "tutoriel" },
  { label: "📞 Support", key: "support" },
];

const ANSWERS: Record<string, string> = {
  depot:
    "💰 Fomba fanaovana dépôt :\n1️⃣ Mandehana ao amin'ny pejy « Dépôt / Recharge ».\n2️⃣ Fidio ny operateur : Orange Money, MVola na Airtel Money.\n3️⃣ Alefaso ny vola amin'ilay numéro aseho (1 000 Ar farafahakeliny).\n4️⃣ Soraty ny montant, ny numéro nandefasanao ary ny référence/Trans ID tao amin'ny SMS.\n5️⃣ Tsindrio « Envoyer la demande ». Hovalidena ao anatin'ny fotoana fohy ny solde-nao.",
  commande:
    "📦 Fomba fanaovana commande :\n1️⃣ Ataovy dépôt aloha mba hisy solde.\n2️⃣ Mandehana ao amin'ny « Services » ary fidio ny plateforme (Facebook, TikTok, Instagram, YouTube).\n3️⃣ Tsindrio ny carte servisy — hisokatra popup.\n4️⃣ Apetraho ny lien sy ny quantité, hita avy hatrany ny total.\n5️⃣ Tsindrio « Commander Maintenant ». Araho ao amin'ny « Mes commandes » ny statut.",
  tutoriel:
    "📚 Misy tutoriel feno ao amin'ny pejy « Tutoriels » : video sy toro-hevitra mba hampiasa tsara ny sehatra. Midira ao izay ijerena tuto 😎",
  support:
    "📞 Support : Messenger BOOST & SERVICE na WhatsApp +261 37 51 410 25. Afaka manoratra ao amin'ny « Groupe de discussion » koa ianao.",
  solde:
    "💳 Ny solde-nao dia hita eo ambony amin'ny header sy ao amin'ny Tableau de bord. Miakatra izy rehefa lany validation ny dépôt.",
  compte:
    "👤 Ny kaonty : afaka mijery commandes, solde, historique sy notifications ao amin'ny « Tableau de bord » ianao.",
  prix: "🏷️ Ny vidiny rehetra dia aseho amin'ny Ariary ao amin'ny pejy Services, arakaraka ny quantité.",
};

function reply(input: string): string {
  const q = input.toLowerCase();
  if (/(depot|dépôt|recharge|vola|payer|mvola|orange|airtel)/.test(q)) return ANSWERS['depot']!;
  if (/(commande|order|commander|boost|followers|likes)/.test(q)) return ANSWERS['commande']!;
  if (/(tuto|video|hianatra)/.test(q)) return ANSWERS['tutoriel']!;
  if (/(support|contact|olana|aide|help)/.test(q)) return ANSWERS['support']!;
  if (/(solde|balance)/.test(q)) return ANSWERS['solde']!;
  if (/(compte|kaonty|profil)/.test(q)) return ANSWERS['compte']!;
  if (/(prix|vidiny|tarif)/.test(q)) return ANSWERS['prix']!;
  if (/(salama|bonjour|hello|salut|manao ahoana)/.test(q))
    return "👋 Salama tompoko! Inona no azoko anampiana anao androany ?";
  return "🤔 Tsy azoko tsara ny fanontaniana. Andramo ireto bokotra haingana ireto na soraty hoe « dépôt », « commande », « tutoriel » na « support ».";
}

export function AiAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: WELCOME }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setMsgs((m) => [...m, { role: "me", text: value }]);
    setInput("");
    window.setTimeout(() => setMsgs((m) => [...m, { role: "ai", text: reply(value) }]), 350);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Service IA"
        className="bsm-btn bsm-btn-primary animate-pulse-ring fixed bottom-24 right-4 z-40 !h-14 !w-14 !p-0 text-2xl"
      >
        🤖
      </button>

      {open ? (
        <div className="fixed bottom-40 right-3 z-50 flex h-[70vh] max-h-[560px] w-[min(92vw,360px)] animate-slide-up flex-col overflow-hidden rounded-3xl bsm-glass">
          <div className="flex items-center justify-between gap-2 border-b border-primary/30 bg-card/80 px-4 py-3">
            <p className="font-display text-sm font-bold">
              🤖 <span className="bsm-neon-text">Service IA</span>
            </p>
            <button onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "ai"
                    ? "bg-secondary text-foreground"
                    : "ml-auto bg-primary text-primary-foreground"
                }`}
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-primary/20 px-3 py-2">
            {QUICK.map((q) => (
              <button
                key={q.key}
                onClick={() => send(q.label)}
                className="rounded-full border border-primary/40 bg-card/70 px-2.5 py-1 text-[10px] font-medium transition-colors hover:bg-primary/15"
              >
                {q.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-primary/20 px-3 py-2"
          >
            <input
              value={input}
              maxLength={300}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Soraty eto ny fanontanianao…"
              className="bsm-input !py-2 !text-xs"
            />
            <button type="submit" className="bsm-btn bsm-btn-primary !px-3 !py-2 !text-xs">
              ➤
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
