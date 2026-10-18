import { EDITIONS } from "@/lib/player";
import { seasonLabel } from "@/lib/stats";
import type { CardView } from "@/lib/cardStyles";

export const em = (n: number) => `${n}em`;

/** Lange namen iets kleiner zodat ze passen. */
export function fit(name: string, base: number, max = 9) {
  return name.length <= max ? base : Math.max(base * 0.55, (base * max) / name.length);
}

export function editionLabel(c: CardView) {
  return (c.season ? seasonLabel(c.season) : EDITIONS[c.edition].name).toUpperCase();
}

export const ovrText = (c: CardView) => `${c.stats.ovr ?? "--"}`;
export const star = (c: CardView) => (c.stats.provisional && c.stats.ovr !== null ? "*" : "");
