/**
 * BOOST SERVICE MADA — Numéros officiels de dépôt Mobile Money.
 * Source unique de vérité : la page Dépôt, l'ancienne page Recharge et la page
 * Contact lisent toutes ces données.
 */

export type OperatorId = "mvola" | "orange" | "airtel";

export type Operator = {
  id: OperatorId;
  /** Nom court affiché sur les boutons et dans l'historique. */
  label: string;
  /** Texte du badge de la carte (majuscules). */
  badge: string;
  emoji: string;
  /** Initiale du logo. */
  mark: string;
  /** Numéro tel qu'il s'affiche, avec espaces. */
  phone: string;
  /** Numéro en chiffres seuls, pour copier / composer. */
  dial: string;
  /** Titulaire du compte. */
  owner: string;
  /** Code USSD du service. */
  ussd: string;
  /** Jeton de couleur de l'opérateur (défini dans src/styles.css). */
  accent: string;
};

export const OPERATORS: Operator[] = [
  {
    id: "mvola",
    label: "MVola",
    badge: "MVOLA",
    emoji: "🟢",
    mark: "M",
    phone: "034 65 466 00",
    dial: "0346546600",
    owner: "MARODOLINX",
    ussd: "#111#",
    accent: "var(--color-op-mvola)",
  },
  {
    id: "orange",
    label: "Orange Money",
    badge: "ORANGE MONEY",
    emoji: "🟠",
    mark: "O",
    phone: "037 51 410 25",
    dial: "0375141025",
    owner: "ROLINE",
    ussd: "#144#",
    accent: "var(--color-op-orange)",
  },
  {
    id: "airtel",
    label: "Airtel Money",
    badge: "AIRTEL MONEY",
    emoji: "🔴",
    mark: "A",
    phone: "033 02 969 08",
    dial: "0330296908",
    owner: "MARODOLINX",
    ussd: "#436#",
    accent: "var(--color-op-airtel)",
  },
];

export const operatorById = (id: string | null | undefined) =>
  OPERATORS.find((o) => o.id === id) ?? null;
