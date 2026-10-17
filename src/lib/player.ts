import type { Game } from "./types";
import {
  bountyHits,
  currentSeason,
  filterSeason,
  headToHead,
  seasonChampions,
  seasonsWithData,
  standings,
  type ResultRow,
} from "./stats";

/* ------------------------------------------------------------------ */
/* Vorm, reeksen en rivaal                                             */
/* ------------------------------------------------------------------ */

export type FormLetter = "W" | "D" | "L";

function mine(rows: ResultRow[], userId: string) {
  return rows.filter((r) => r.user_id === userId).sort((a, b) => a.finished_at.localeCompare(b.finished_at));
}

/** Laatste potjes als W (gewonnen), D (gedeelde eerste plek) of L, oudste links. */
export function recentForm(rows: ResultRow[], userId: string, n = 5): FormLetter[] {
  return mine(rows, userId)
    .slice(-n)
    .map((r) => (r.is_winner ? "W" : r.placement === 1 ? "D" : "L"));
}

/** Huidige winstreeks en langste winstreeks ooit. */
export function streaks(rows: ResultRow[], userId: string) {
  let best = 0;
  let cur = 0;
  for (const r of mine(rows, userId)) {
    cur = r.is_winner ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return { current: cur, best };
}

/**
 * Je grootste rivaal: met wie je vaak speelt én het spannend is.
 * Minimaal 3 onderlinge potjes; iemand die je één keer versloeg telt niet.
 */
export function findRival(rows: ResultRow[], userId: string) {
  const others = [...new Set(rows.map((r) => r.user_id))].filter((u) => u !== userId);
  let best: { opponent: string; wins: number; losses: number; draws: number; score: number } | null = null;
  for (const o of others) {
    const h = headToHead(rows, userId, o);
    const n = h.wins + h.losses + h.draws;
    if (n < 3) continue;
    const closeness = 1 - Math.abs(h.wins - h.losses) / n; // 1 = helemaal gelijk op
    const score = n * (0.4 + 0.6 * closeness);
    if (!best || score > best.score) best = { opponent: o, wins: h.wins, losses: h.losses, draws: h.draws, score };
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Overall Rating (OVR)                                                */
/* ------------------------------------------------------------------ */

/**
 * OVR 40–99 uit vier onderdelen (elk eerst omgezet naar 0–1):
 *  - Winpercentage 35%
 *  - Gemiddelde eindpositie 25% (1e = 1, laatste = 0, ongeacht hoeveel spelers)
 *  - Prestaties over verschillende games 20% (elke game telt even zwaar, meer games = beter)
 *  - Recente vorm 20% (eindpositie in je laatste 10 potjes)
 * Teamspellen wegen voor 75% mee (je prestatie hangt deels van je team af).
 * Met weinig potjes trekt een correctie de score naar het midden, en heet de rating "voorlopig".
 */
export const OVR_WEIGHTS = { win: 0.35, position: 0.25, versatility: 0.2, form: 0.2 } as const;
const PRIOR_MATCHES = 8;
const PRIOR_VALUE = 0.45;
export const PROVISIONAL_BELOW = 10;

export type Ovr = {
  ovr: number;
  provisional: boolean;
  played: number;
  parts: { win: number; position: number; versatility: number; form: number };
};

/** Grootte van elk potje (hoogste plek), nodig om eindposities eerlijk te vergelijken. */
export function matchSizes(allRows: ResultRow[]) {
  const size = new Map<string, number>();
  for (const r of allRows) size.set(r.match_id, Math.max(size.get(r.match_id) ?? 1, r.placement));
  return size;
}

export function computeOvr(
  rows: ResultRow[],
  userId: string,
  sizes: Map<string, number>,
  games: Map<string, Pick<Game, "game_type">>,
): Ovr | null {
  const rs = mine(rows, userId);
  if (!rs.length) return null;
  const weight = (r: ResultRow) => (games.get(r.game_id)?.game_type === "solo" ? 1 : 0.75);
  const pos = (r: ResultRow) => {
    const n = sizes.get(r.match_id) ?? 1;
    return n > 1 ? 1 - (r.placement - 1) / (n - 1) : 1;
  };
  const wmean = (list: ResultRow[], f: (r: ResultRow) => number) => {
    let s = 0;
    let w = 0;
    for (const r of list) {
      s += f(r) * weight(r);
      w += weight(r);
    }
    return w ? s / w : 0;
  };

  const win = wmean(rs, (r) => (r.is_winner ? 1 : 0));
  const position = wmean(rs, pos);
  const byGame = new Map<string, ResultRow[]>();
  for (const r of rs) byGame.set(r.game_id, [...(byGame.get(r.game_id) ?? []), r]);
  const perGame = [...byGame.values()].map((l) => wmean(l, pos));
  const coverage = Math.min(1, byGame.size / 4);
  const versatility = (perGame.reduce((a, b) => a + b, 0) / perGame.length) * (0.6 + 0.4 * coverage);
  const form = wmean(rs.slice(-10), pos);

  const raw =
    OVR_WEIGHTS.win * win +
    OVR_WEIGHTS.position * position +
    OVR_WEIGHTS.versatility * versatility +
    OVR_WEIGHTS.form * form;
  const n = rs.length;
  const adjusted = (raw * n + PRIOR_VALUE * PRIOR_MATCHES) / (n + PRIOR_MATCHES);
  const ovr = Math.max(40, Math.min(99, Math.round(45 + adjusted * 54)));
  return { ovr, provisional: n < PROVISIONAL_BELOW, played: n, parts: { win, position, versatility, form } };
}

/* ------------------------------------------------------------------ */
/* Kaarten                                                             */
/* ------------------------------------------------------------------ */

export type EditionId = "standard" | "gold" | "rivalry" | "legend" | "underdog" | "undefeated";

export const EDITIONS: Record<EditionId, { name: string; how: string }> = {
  standard: { name: "Standard", how: "Iedere speler heeft deze kaart." },
  gold: { name: "Gold Champion", how: "Win een seizoen." },
  rivalry: { name: "Rivalry", how: "Versla dezelfde tegenstander 10 keer." },
  legend: { name: "Legend", how: "Win 2 seizoenen, haal level 15 of win 100 potjes." },
  underdog: { name: "Underdog", how: "Versla de koploper van het seizoen in een potje." },
  undefeated: { name: "Undefeated", how: "Win op één avond al je potjes (minstens 3)." },
};
export const EDITION_ORDER: EditionId[] = ["standard", "gold", "rivalry", "legend", "underdog", "undefeated"];

export const NICKNAMES: Record<string, string> = {
  Rookie: "THE ROOKIE",
  Speler: "THE PLAYER",
  Pro: "THE PRO",
  Veteraan: "THE VETERAN",
  Legende: "THE LEGEND",
  Grootmeester: "THE GRANDMASTER",
};

/** Kaart-attributen (40–99), net als bij een voetbalkaart. */
export type CardAttrs = { win: number; pos: number; all: number; vrm: number };

export type CardStats = {
  ovr: number | null;
  provisional: boolean;
  winPct: number;
  games: number;
  streak: number;
  trophies: number;
  attrs?: CardAttrs | null;
  /** Meest gespeelde game */
  mainGame?: string | null;
};

function attr(x: number, n: number) {
  const adj = (x * n + PRIOR_VALUE * PRIOR_MATCHES) / (n + PRIOR_MATCHES);
  return Math.max(40, Math.min(99, Math.round(45 + adj * 54)));
}

export type SeasonCard = CardStats & { season: string; rank: number | null; edition: "standard" | "gold" };

export type Collection = {
  current: CardStats;
  earned: Record<EditionId, boolean>;
  seasons: SeasonCard[];
  seasonTitles: number;
};

function statsFor(rows: ResultRow[], userId: string, sizes: Map<string, number>, games: Map<string, Pick<Game, "game_type">>, trophies: number): CardStats {
  const rs = rows.filter((r) => r.user_id === userId);
  const wins = rs.filter((r) => r.is_winner).length;
  const o = computeOvr(rows, userId, sizes, games);
  const count = new Map<string, number>();
  for (const r of rs) count.set(r.game_id, (count.get(r.game_id) ?? 0) + 1);
  const mainGame = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    attrs: o
      ? {
          win: attr(o.parts.win, o.played),
          pos: attr(o.parts.position, o.played),
          all: attr(o.parts.versatility, o.played),
          vrm: attr(o.parts.form, Math.min(o.played, 10)),
        }
      : null,
    mainGame,
    ovr: o?.ovr ?? null,
    provisional: o?.provisional ?? true,
    winPct: rs.length ? Math.round((wins / rs.length) * 100) : 0,
    games: rs.length,
    streak: streaks(rows, userId).best,
    trophies,
  };
}

/** Alles wat iemand aan kaarten heeft: de actuele kaart, vrijgespeelde edities en kaarten per afgelopen seizoen. */
export function buildCollection(
  allRows: ResultRow[],
  userId: string,
  games: Map<string, Pick<Game, "game_type">>,
  extra: { level: number; gameTitles: number },
): Collection {
  const sizes = matchSizes(allRows);
  const champs = seasonChampions(allRows);
  const seasonTitles = [...champs.values()].filter((u) => u === userId).length;
  const trophies = seasonTitles + extra.gameTitles;
  const current = statsFor(allRows, userId, sizes, games, trophies);

  const others = [...new Set(allRows.map((r) => r.user_id))].filter((u) => u !== userId);
  const rivalry = others.some((o) => headToHead(allRows, userId, o).wins >= 10);

  // Ongeslagen avond: alle potjes van één avond gewonnen (minstens 3)
  const perNight = new Map<string, { played: number; wins: number }>();
  for (const r of allRows) {
    if (r.user_id !== userId || !r.night_id) continue;
    const e = perNight.get(r.night_id) ?? { played: 0, wins: 0 };
    e.played++;
    if (r.is_winner) e.wins++;
    perNight.set(r.night_id, e);
  }
  const undefeated = [...perNight.values()].some((e) => e.played >= 3 && e.wins === e.played);

  const wins = allRows.filter((r) => r.user_id === userId && r.is_winner).length;
  const earned: Record<EditionId, boolean> = {
    standard: true,
    gold: seasonTitles >= 1,
    rivalry,
    legend: seasonTitles >= 2 || extra.level >= 15 || wins >= 100,
    underdog: (bountyHits(allRows).get(userId) ?? 0) >= 1,
    undefeated,
  };

  // Seizoenskaarten: alleen afgelopen seizoenen waarin je speelde (cijfers van dat seizoen)
  const now = currentSeason();
  const seasons: SeasonCard[] = [];
  for (const s of seasonsWithData(allRows)) {
    if (s >= now) continue;
    const rows = filterSeason(allRows, s);
    if (!rows.some((r) => r.user_id === userId)) continue;
    const st = standings(rows).find((x) => x.user_id === userId);
    const champ = champs.get(s) === userId;
    seasons.push({
      ...statsFor(rows, userId, sizes, games, champ ? 1 : 0),
      season: s,
      rank: st?.rank ?? null,
      edition: champ ? "gold" : "standard",
    });
  }
  seasons.sort((a, b) => b.season.localeCompare(a.season));
  return { current, earned, seasons, seasonTitles };
}

/** Welke kaart iemand laat zien: zijn eigen keuze als die geldig is, anders de mooiste die hij heeft. */
export function displayedCard(col: Collection, favorite: string | null | undefined) {
  if (favorite?.startsWith("season:")) {
    const s = col.seasons.find((x) => `season:${x.season}` === favorite);
    if (s) return { kind: "season" as const, edition: s.edition as EditionId, stats: s as CardStats, season: s.season };
  }
  if (favorite && (EDITION_ORDER as string[]).includes(favorite) && col.earned[favorite as EditionId]) {
    return { kind: "edition" as const, edition: favorite as EditionId, stats: col.current, season: null };
  }
  const best = (["legend", "gold", "rivalry", "undefeated", "underdog", "standard"] as EditionId[]).find(
    (e) => col.earned[e],
  )!;
  return { kind: "edition" as const, edition: best, stats: col.current, season: null };
}

/* ------------------------------------------------------------------ */
/* Beloningen per level (cosmetisch)                                   */
/* ------------------------------------------------------------------ */

export const LEVEL_REWARDS: { level: number; name: string }[] = [
  { level: 3, name: "Pixel-banner in je Player Hub" },
  { level: 5, name: "Gekleurde rand om je avatar" },
  { level: 7, name: "Neon-profielbanner" },
  { level: 10, name: "Bewegend avatar-effect" },
  { level: 15, name: "Legend-kaart" },
];

export function nextReward(level: number) {
  return LEVEL_REWARDS.find((r) => r.level > level) ?? null;
}
