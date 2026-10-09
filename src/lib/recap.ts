import type { Match, MatchResult } from "./types";

export type RecapRow = { user_id: string; points: number; wins: number; played: number; last: number };

export type Recap = {
  matches: number;
  games: string[];
  rows: RecapRow[];
  mvp: string | null;
  mostWins: { user_id: string; wins: number } | null;
  unlucky: { user_id: string; last: number } | null;
};

/** Rekent de samenvatting van een avond uit (zelfde regels als finish_night in de database). */
export function computeRecap(matches: Match[], results: MatchResult[]): Recap | null {
  const done = matches.filter((m) => m.status === "finished");
  if (!done.length) return null;
  const doneIds = new Set(done.map((m) => m.id));
  const res = results.filter((r) => doneIds.has(r.match_id));

  const maxPlace = new Map<string, number>();
  for (const r of res) maxPlace.set(r.match_id, Math.max(maxPlace.get(r.match_id) ?? 0, r.placement));

  const by = new Map<string, RecapRow>();
  for (const r of res) {
    const row = by.get(r.user_id) ?? { user_id: r.user_id, points: 0, wins: 0, played: 0, last: 0 };
    row.points += Number(r.league_points);
    row.wins += r.is_winner ? 1 : 0;
    row.played += 1;
    if (r.placement > 1 && r.placement === maxPlace.get(r.match_id)) row.last += 1;
    by.set(r.user_id, row);
  }
  const rows = [...by.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);

  const unique = <K extends "points" | "wins" | "last">(key: K) => {
    const top = Math.max(0, ...rows.map((r) => r[key]));
    const at = rows.filter((r) => r[key] === top);
    return top > 0 && at.length === 1 ? at[0] : null;
  };
  const mvp = unique("points");
  const w = unique("wins");
  const l = unique("last");

  return {
    matches: done.length,
    games: [...new Set(done.map((m) => m.game_id))],
    rows,
    mvp: mvp?.user_id ?? null,
    mostWins: w ? { user_id: w.user_id, wins: w.wins } : null,
    unlucky: l ? { user_id: l.user_id, last: l.last } : null,
  };
}
