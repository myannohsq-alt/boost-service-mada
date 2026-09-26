import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "mg" | "fr";

type Dict = Record<string, { mg: string; fr: string }>;

export const dict: Dict = {
  slogan: {
    mg: "🚀 Boost Malagasy • Haingana • Matihanina • Misokatra 24/24",
    fr: "🚀 Boost Malagasy • Rapide • Professionnel • Disponible 24h/24",
  },
  heroSubtitle: {
    mg: "🇲🇬 Sehatra Malagasy ho an'ny Boost Réseaux Sociaux.",
    fr: "🇲🇬 Plateforme Malagasy de Boost Réseaux Sociaux.",
  },
  deposit: { mg: "💳 Hanao dépôt", fr: "💳 Faire un dépôt" },
  orderNow: { mg: "🚀 Hanafatra izao", fr: "🚀 Commander maintenant" },
  contactSupport: { mg: "📞 Hifandray amin'ny support", fr: "📞 Contacter le support" },
  home: { mg: "🏠 Fandraisana", fr: "🏠 Accueil" },
  services: { mg: "🛒 Serivisy", fr: "🛒 Services" },
  depositNav: { mg: "💳 Dépôt", fr: "💳 Dépôt" },
  recharge: { mg: "💰 Recharge", fr: "💰 Recharge" },
  myOrders: { mg: "📦 Ny commande-ko", fr: "📦 Mes commandes" },
  profile: { mg: "👤 Profil", fr: "👤 Profil" },
  referral: { mg: "🎁 Parrainage", fr: "🎁 Parrainage" },
  news: { mg: "📰 Vaovao", fr: "📰 Actualités" },
  promotions: { mg: "🎉 Promotions", fr: "🎉 Promotions" },
  tutorial: { mg: "📖 Tutoriel", fr: "📖 Tutoriel" },
  protection: { mg: "🛡️ Fiarovana Kaonty", fr: "🛡️ Protection Compte" },
  faq: { mg: "❓ FAQ", fr: "❓ FAQ" },
  contact: { mg: "📞 Contact", fr: "📞 Contact" },
  reviews: { mg: "⭐ Avis", fr: "⭐ Avis clients" },
  admin: { mg: "🛠️ Admin", fr: "🛠️ Admin" },
  login: { mg: "Hiditra", fr: "Connexion" },
  logout: { mg: "Hivoaka", fr: "Déconnexion" },
  signup: { mg: "Hisoratra anarana", fr: "Inscription" },
  name: { mg: "👤 Anarana", fr: "👤 Nom" },
  phone: { mg: "📱 Telefaonina", fr: "📱 Téléphone" },
  password: { mg: "🔒 Tenimiafina", fr: "🔒 Mot de passe" },
  balance: { mg: "💰 Solde", fr: "💰 Solde" },
  history: { mg: "📜 Tantara", fr: "📜 Historique" },
  quantity: { mg: "Isa", fr: "Quantité" },
  link: { mg: "Rohy (lien)", fr: "Lien (URL)" },
  order: { mg: "Hanafatra", fr: "Commander" },
  total: { mg: "Totaly", fr: "Total" },
  promoCode: { mg: "Code promo (raha misy)", fr: "Code promo (optionnel)" },
  minDeposit: { mg: "Dépôt farany ambany: 1 000 Ar", fr: "Dépôt minimum : 1 000 Ar" },
  senderNumber: { mg: "📱 Laharana nandefa vola", fr: "📱 Numéro ayant envoyé l'argent" },
  reference: { mg: "🔢 Référence transaction", fr: "🔢 Référence transaction" },
  amountSent: { mg: "💵 Vola nalefa", fr: "💵 Montant envoyé" },
  validateRecharge: { mg: "✅ Hamarino ny recharge", fr: "✅ Valider la recharge" },
  pending: { mg: "🟡 Miandry", fr: "🔵 En cours" },
  processing: { mg: "🔵 Am-panaovana", fr: "🔵 En cours" },
  done: { mg: "🟢 Vita", fr: "🟢 Terminée" },
  rejected: { mg: "🔴 Nolavina", fr: "🔴 Refusée" },
  notifications: { mg: "🔔 Fampandrenesana", fr: "🔔 Notifications" },
  loginRequired: { mg: "Midira aloha azafady.", fr: "Veuillez vous connecter." },
  users: { mg: "👥 Mpampiasa", fr: "👥 Utilisateurs" },
  ordersDelivered: { mg: "📦 Commande vita", fr: "📦 Commandes livrées" },
  servicesAvailable: { mg: "🚀 Serivisy misy", fr: "🚀 Services disponibles" },
  clientReviews: { mg: "⭐ Avis mpanjifa", fr: "⭐ Avis clients" },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string };

const I18nContext = createContext<Ctx>({ lang: "mg", setLang: () => {}, t: (k) => dict[k]?.mg ?? String(k) });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mg");

  useEffect(() => {
    const saved = window.localStorage.getItem("bsm-lang");
    if (saved === "fr" || saved === "mg") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("bsm-lang", l);
  }, []);

  const t = useCallback((k: keyof typeof dict) => dict[k]?.[lang] ?? String(k), [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export const formatAr = (n: number) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} Ar`;
