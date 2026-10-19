import type { Recap, RecapRow } from "./recap";

/**
 * Podium van één avond, op basis van de recap (zelfde cijfers als de recap en het nieuws).
 * Plaats = 1 + aantal spelers met méér punten. Dat is dezelfde regel als de MVP van de avond:
 * wie gelijk staat op punten deelt de plek (er wordt geen winnaar geforceerd).
 */
export type PodiumRow = RecapRow & { place: number };
export type PodiumStep = { place: 1 | 2 | 3; rows: PodiumRow[] };

export function podiumStandings(recap: Recap): PodiumRow[] {
  return recap.rows.map((r) => ({ ...r, place: 1 + recap.rows.filter((o) => o.points > r.points).length }));
}

/** Podiumplekken 1, 2 en 3 (alleen die bestaan; bij een gedeelde plek kan er één wegvallen). */
export function podiumSteps(rows: PodiumRow[]): PodiumStep[] {
  const out: PodiumStep[] = [];
  for (const place of [1, 2, 3] as const) {
    const at = rows.filter((r) => r.place === place);
    if (at.length) out.push({ place, rows: at });
  }
  return out;
}
