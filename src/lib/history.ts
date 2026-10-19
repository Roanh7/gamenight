import type { Match } from "./types";
import { currentSeason, filterSeason, seasonChampions, seasonOf, standings, type ResultRow } from "./stats";

/**
 * Historische seizoenen 📜
 * Een potje hoort bij het seizoen waarin het voor het eerst werd afgerond (de database bewaart dat
 * moment bij een correctie). Wijzigingen aan een afgelopen seizoen vragen een bewuste bevestiging.
 */

/** Het moment dat bepaalt bij welk seizoen een potje hoort. */
export function matchMoment(m: Pick<Match, "finished_at" | "original_finished_at">) {
  return m.original_finished_at ?? m.finished_at ?? null;
}

/** Hoort dit potje bij een afgelopen (afgesloten) seizoen? */
export function isHistoricMatch(m: Pick<Match, "finished_at" | "original_finished_at">, now = currentSeason()) {
  const at = matchMoment(m);
  return !!at && seasonOf(at) < now;
}

/** De afgelopen seizoenen waar deze potjes bij horen. */
export function historicSeasons(matches: Pick<Match, "finished_at" | "original_finished_at">[]) {
  const now = currentSeason();
  return [...new Set(matches.filter((m) => isHistoricMatch(m, now)).map((m) => seasonOf(matchMoment(m)!)))].sort();
}

export type SeasonImpact = {
  season: string;
  results: number; // aantal uitslagregels dat verdwijnt
  championBefore: string | null;
  championAfter: string | null;
  movers: { user_id: string; before: number | null; after: number | null }[]; // plek voor/na
};

/** Wat verandert er in afgelopen seizoenen als deze potjes verdwijnen? (voor de waarschuwing) */
export function seasonImpact(results: ResultRow[], removeMatchIds: Set<string>): SeasonImpact[] {
  const removed = results.filter((r) => removeMatchIds.has(r.match_id));
  const now = currentSeason();
  const seasons = [...new Set(removed.map((r) => seasonOf(r.finished_at)))].filter((s) => s < now).sort();
  if (!seasons.length) return [];
  const after = results.filter((r) => !removeMatchIds.has(r.match_id));
  const champsBefore = seasonChampions(results);
  const champsAfter = seasonChampions(after);
  return seasons.map((season) => {
    const b = standings(filterSeason(results, season));
    const a = standings(filterSeason(after, season));
    const ids = new Set([...b.map((x) => x.user_id), ...a.map((x) => x.user_id)]);
    const movers = [...ids]
      .map((user_id) => ({
        user_id,
        before: b.find((x) => x.user_id === user_id)?.rank ?? null,
        after: a.find((x) => x.user_id === user_id)?.rank ?? null,
      }))
      .filter((m) => m.before !== m.after)
      .sort((x, y) => (x.before ?? 999) - (y.before ?? 999));
    return {
      season,
      results: removed.filter((r) => seasonOf(r.finished_at) === season).length,
      championBefore: champsBefore.get(season) ?? null,
      championAfter: champsAfter.get(season) ?? null,
      movers,
    };
  });
}

export type HallEntry = { user_id: string; titles: number; seasons: string[]; rank: number };
export type HallSeason = { season: string; champion: string | null };

/**
 * 👑 Hall of Champions: alle seizoenskampioenen (zelfde regel als de rest van de app: alleen een
 * unieke nummer 1 van een afgelopen seizoen). Meeste titels eerst; gelijk aantal = gedeelde plek.
 */
export function hallOfChampions(rows: ResultRow[]): { entries: HallEntry[]; timeline: HallSeason[] } {
  const champs = seasonChampions(rows);
  const now = currentSeason();
  const past = [...new Set(rows.map((r) => seasonOf(r.finished_at)))].filter((s) => s < now).sort();
  const timeline = past.map((season) => ({ season, champion: champs.get(season) ?? null })).reverse();
  const by = new Map<string, string[]>();
  for (const [season, user] of champs) by.set(user, [...(by.get(user) ?? []), season]);
  const list = [...by.entries()].map(([user_id, seasons]) => ({ user_id, titles: seasons.length, seasons: seasons.sort().reverse() }));
  const entries = list
    .map((e) => ({ ...e, rank: 1 + list.filter((o) => o.titles > e.titles).length }))
    .sort((a, b) => a.rank - b.rank || (a.seasons[0] < b.seasons[0] ? 1 : -1));
  return { entries, timeline };
}
