import type { ResultRow } from "./stats";

/**
 * Wanted-systeem (zelfde regels als private.sync_wanted_news in de database):
 *  - 3 officiële zeges op rij = Wanted. Potjes waar je niet meespeelt tellen niet.
 *  - Verlies of gelijkspel beëindigt de reeks.
 *  - Wie de reeks breekt door te winnen, krijgt de premie. Bij een teamwinst wordt de premie
 *    over de winnaars verdeeld. Zonder winnaar (gelijkspel) vervalt de premie.
 *  - De Wanted-speler zelf krijgt geen premie-XP.
 *  - Potjes van een avond waar de host Wanted uitzette, tellen nergens voor mee.
 */
export const WANTED_LEVELS = [
  { id: "public_enemy", min: 7, name: "Public Enemy #1", xp: 40 },
  { id: "most_wanted", min: 5, name: "Most Wanted", xp: 25 },
  { id: "wanted", min: 3, name: "Wanted", xp: 15 },
] as const;

export type WantedLevel = (typeof WANTED_LEVELS)[number];

export function wantedLevel(streak: number): WantedLevel | null {
  return WANTED_LEVELS.find((l) => streak >= l.min) ?? null;
}

export type BountyClaim = { matchId: string; target: string; streak: number; winners: string[]; xp: number };

export type WantedState = {
  /** Huidige reeks per speler (alleen officiële Wanted-potjes) */
  streak: Map<string, number>;
  /** Extra XP uit geclaimde premies */
  xp: Map<string, number>;
  /** Aantal keer dat iemand een premie claimde */
  claims: Map<string, number>;
  /** Alle geclaimde premies (op volgorde) */
  history: BountyClaim[];
};

export function computeWanted(rows: ResultRow[]): WantedState {
  const byMatch = new Map<string, ResultRow[]>();
  for (const r of rows) {
    if (r.wanted_off) continue;
    byMatch.set(r.match_id, [...(byMatch.get(r.match_id) ?? []), r]);
  }
  const order = [...byMatch.entries()].sort(([ida, a], [idb, b]) => {
    const sa = a[0].started_at ?? a[0].finished_at;
    const sb = b[0].started_at ?? b[0].finished_at;
    return sa === sb ? ida.localeCompare(idb) : sa < sb ? -1 : 1;
  });

  const streak = new Map<string, number>();
  const xp = new Map<string, number>();
  const claims = new Map<string, number>();
  const history: BountyClaim[] = [];

  for (const [matchId, rs] of order) {
    const winners = rs.filter((r) => r.is_winner).map((r) => r.user_id);
    for (const r of rs) {
      const s = streak.get(r.user_id) ?? 0;
      if (r.is_winner) {
        streak.set(r.user_id, s + 1);
        continue;
      }
      const lvl = wantedLevel(s);
      if (lvl && winners.length) {
        const share = winners.length === 1 ? lvl.xp : Math.max(1, Math.round(lvl.xp / winners.length));
        for (const w of winners) {
          xp.set(w, (xp.get(w) ?? 0) + share);
          claims.set(w, (claims.get(w) ?? 0) + 1);
        }
        history.push({ matchId, target: r.user_id, streak: s, winners, xp: share });
      }
      streak.set(r.user_id, 0);
    }
  }
  return { streak, xp, claims, history };
}

/** Wie er nu Wanted is, hoogste reeks eerst. */
export function wantedNow(state: WantedState) {
  return [...state.streak.entries()]
    .map(([user_id, streak]) => ({ user_id, streak, level: wantedLevel(streak) }))
    .filter((w): w is { user_id: string; streak: number; level: WantedLevel } => w.level !== null)
    .sort((a, b) => b.streak - a.streak);
}
