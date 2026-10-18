import type { CardStats, EditionId } from "./player";

export type CardStyle = "gameboy" | "rpg" | "arcade" | "trading";

export const CARD_STYLES: { id: CardStyle; name: string; desc: string }[] = [
  { id: "trading", name: "Verzamelkaart", desc: "8-bit kaart met je beste games als aanvallen" },
  { id: "gameboy", name: "Game Boy", desc: "Groen schermpje met blokjesbalken" },
  { id: "rpg", name: "RPG-menu", desc: "Blauwe vensters zoals in oude rollenspellen" },
  { id: "arcade", name: "Arcadekast", desc: "Neon high-score op een zwart scherm" },
];

export const DEFAULT_STYLE: CardStyle = "trading";

export function safeStyle(v: unknown): CardStyle {
  return CARD_STYLES.some((s) => s.id === v) ? (v as CardStyle) : DEFAULT_STYLE;
}

/** Alles wat een kaart nodig heeft om getekend te worden. */
export type CardView = {
  name: string;
  color: string | null;
  emoji: string | null;
  style: CardStyle;
  nickname: string;
  level: number;
  edition: EditionId;
  season: string | null;
  stats: CardStats;
  top: { icon: string; name: string; wins: number }[];
  weak: { icon: string; name: string } | null;
};
