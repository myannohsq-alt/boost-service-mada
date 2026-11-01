// Commentaires « Traite 🔥 » fournis par l'admin ; les variantes sont générées localement.
import { EXTRA } from "./traite-extra";
const BASE = [
  "❤️‍🔥🫶#Tsara🫶❤️‍🔥", "🪶🥀𝔟𝔬̃𝔰𝔰 𝔩𝔩🪶", "𝑮𝒐𝒐𝒅 🔥", "#Gøød🔥", "Super ✅🔥", "🫀 🪽#𝗚𝗢𝗢𝗗🫰🏻🤎",
  "👑🫶 #STÃR 🐊🥷🏻", "🖇️🤎𝐆𝐨𝐨𝐝🫶❤‍🔥", "🌵#Kiass📷🌴", "Tsara💥✔", "𝓜𝓪𝓷𝓭𝓸𝓷𝓪 𝓷𝓪𝓶𝓪 🔥😎", "Man🔥😎",
  "Merveilleux 🫶🥰", "Soa", "M'lay", "Patron 😎 🤑", "Way", "Boss⭐🔥", "Good 💖🔥", "👑🫶 Bomm 🦅💎",
  "Ça va 🥰🔥", "mlay 🖤🤍", "𝗝'𝗮𝒅𝒐𝒓𝒆♡🫶🏼❤‍🩹", "Retour 🙏", "Good 👍", "༒Gøød🫶🏻🪶❤️‍🔥༒", "𝐁𝐢𝐞𝐧❤️",
  "Gd picture 📸🔥", "💜🌟Brilha •🦋💜", "❤ 𝐏𝐎𝐏𝐔𝐋𝐀𝐑", "🔥", "🥺👑 𝑱' 𝒂𝒅𝒐𝒓𝒆 ...🫶🏼❤‍🩹", "Tatsa ✅🎯",
  "Kiass 🤘🏾", "𝗝'𝗮𝒅𝒐𝒓𝒆❤️‍🔥...🫶", "Good ❤💞", "Jolie 💕", "Malik👑", "😊💖", "#Goođ♥️🔥", "Gd🔥",
  "🪶♧︎𝑮𝑶𝑶𝑫♧︎🪶", "Gd 💥", "Soa ❤️", "🙈♧︎ #𝑮𝑶𝑶𝑫 ♧︎ 💗🍒", "Bomm🔥", "#ASIO_KOA_NENA 🙈🙏💗😝",
  "𝘛𝘳𝘢𝘯𝘲𝘶𝘪𝘭𝘭𝘦 🤟💥", "#PERFECT🥥", "Good😘💥", "Mamy 💖💕", "✘ ✘ kiasS🔥", "Kiasy 🔥❤", "M'lay😻",
  "Tsara 💗", "Tsara🥰", "Mamy💗", "So cute 🥹", "Manao 🔥", "J'ADORE cette photo 😍", "𝙏𝙨𝙖𝙧𝙖🤞🥰",
  "Tsaraa 👀❤", "♥️♥️", "Coucou🔥", "Bonjour🔥👍", "Ao soa💖", "#GOOD…💰🤗", "🪶#Good🧸", "Tsara 🔥",
  "Kiffekou💓", "So pretty ❤", "🧸#NORMA🚨❤️‍🩹", "#𝑵𝒐𝒓𝒎𝒆💜", "Soa 🥰😘", "…🧸𝐓𝐬𝐚𝐫𝐚❤️‍🔥...", "#Tsara ✨🔥",
  "bien ✨🤟❤️‍🩹", "♡♥♡ 𝐓𝐬𝐚𝐫𝐚 𝐤𝐚 𝐭𝐞𝐧𝐚 𝐓𝐬𝐚𝐫𝐚♡♥♡", "Retard 😍", "C'est bien de revé 🥂😎", "J'adore quand même",
  "Zao nef tena efa tsra b!!🥰", "Trop💯", "Pretty good!", "Mafinaritryeee 💖💖", "Top", "Zegn ay", "Shoua💗",
  "𝙏𝙨𝙖𝙧𝙖☘️𝙡𝙚 𝙨𝙖𝙧𝙮 𝙙𝙚 𝙣𝙖𝙨𝙞𝙠𝙤🌹 𝙟'𝙖𝙙𝙤𝙧𝙚❤ 𝙢𝙗𝙖 𝙖𝙨𝙞𝙤🙏🏻 𝙠𝙤𝙖 𝙣𝙮 𝙥𝙪𝙗 𝙘𝙤 𝙖𝙤✍",
  "Tsara ilay sary dia nasiako j'adore ❤️ raha tianao izany dia mba asio ko le pub ako 🙏",
];
const WORDS = ["Tsara", "Good", "M'lay", "Kiass", "Soa", "J'adore", "Bomm", "Boss", "Mamy", "Top", "Perfect", "Tena tsara", "Mahafinaritra", "Jolie", "Star"];
const EMO = ["🔥", "❤️‍🔥", "🫶", "🥰", "😍", "💖", "✨", "👑", "💯", "🥷🏻", "🦋", "🌹", "😎", "💥", "🤎", "🧸", "🪶", "🇲🇬", "🙏", "📸"];
const DECOR: [string, string][] = [["#", ""], ["", ""], ["❤️‍🔥🫶", "🫶❤️‍🔥"], ["༒", "༒"], ["🪶", "🪶"], ["✘ ✘ ", ""], ["♡ ", " ♡"], ["…", "…"]];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

// Facebook affiche l’apostrophe ASCII comme « &#039; » : on la remplace par ’ (et & par « et »).
export const cleanComment = (s: string) => s.replace(/['`´]/g, "’").replace(/&/g, "et");

export const MAX_REPEAT = 4;

export function generateTraite(count: number): string[] {
  const pool = [...new Set([...BASE, ...EXTRA].map(cleanComment))];
  const out: string[] = [];
  // Chaque tour utilise TOUS les commentaires une fois avant d’en répéter un ; max 4 fois chacun.
  for (let round = 0; round < MAX_REPEAT && out.length < count; round++) {
    for (const c of shuffle(pool)) { if (out.length >= count) break; out.push(c); }
  }
  const seen = new Set(out);
  let guard = 0;
  while (out.length < count && guard++ < count * 50) {
    const [l, r] = pick(DECOR);
    const c = cleanComment(Math.random() < 0.5 ? `${pick(pool)} ${pick(EMO)}` : `${l}${pick(WORDS)}${r} ${pick(EMO)}${Math.random() < 0.5 ? pick(EMO) : ""}`);
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  // Mélange final pour éviter que les répétitions se suivent en blocs.
  return spread(out);
}

function spread(list: string[]): string[] {
  const s = shuffle(list);
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) {
      const j = s.findIndex((x, k) => k > i && x !== s[i] && s[k - 1] !== s[i] && s[k + 1] !== s[i]);
      if (j > 0) [s[i], s[j]] = [s[j]!, s[i]!];
    }
  }
  return s;
}

const HBD = ["Joyeux anniversaire", "Hbd", "Tratry ny tsingerintaona", "Arahabaina tratry ny tsingerintaona", "Mirary soa sy fahasalamana", "Happy birthday", "Bon anniversaire", "Tratry ny faha teraka", "Mirary fiadanana sy fahombiazana", "Hbd e", "Tsingerintaona sambatra", "Andriamanitra anie hitahy anao"];
const HBD_EMO = ["🎂", "🎉", "🎊", "🥳", "🎁", "✨", "🎈", "💐", "❤️", "🙏", "🫶", "🌹"];
const VENTE = ["Prix svp", "Mp", "Mbola misy ve ?", "Tena tsara ilay entana", "Efa nandray aho misaotra", "Combien svp", "Tiako io", "Inona ny vidiny ?", "Livraison any amin'ny faritra ve ?", "Qualité top", "Recommandé 💯", "Mba alefaso prix inbox", "Disponible ?", "Tena mety", "Efa voaray ny entako, misaotra", "Interessée", "Ohatrinona ?"];
const VENTE_EMO = ["🎀", "🛍️", "💯", "🔥", "😍", "👌", "🙏", "✨", "💖", "📦"];

function variants(base: string[], emo: string[], count: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < count && guard++ < count * 60) {
    const c = cleanComment(`${pick(base)}${Math.random() < 0.3 ? " e" : ""} ${pick(emo)}${Math.random() < 0.6 ? pick(emo) : ""}${Math.random() < 0.3 ? pick(emo) : ""}`);
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
export const generateHbd = (count: number) => variants(HBD, HBD_EMO, count);
export const generateVente = (count: number) => variants(VENTE, VENTE_EMO, count);
