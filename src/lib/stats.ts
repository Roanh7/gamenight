import type { MatchResult } from "./types";

/** Resultaat van één speler in één afgerond potje, met het moment van afronden. */
export type ResultRow = MatchResult & { finished_at: string; night_id?: string };

export type Standing = {
  user_id: string;
  played: number;
  wins: number;
  points: number;
  games_played: number;
  rank: number;
};

/* ---------------- Seizoenen (per kwartaal) ---------------- */

const TZ = "Europe/Amsterdam";

/** "2026-Q4" */
export function seasonOf(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = Number(parts.find((p) => p.type === "month")!.value);
  return `${year}-Q${Math.ceil(month / 3)}`;
}

export function currentSeason() {
  return seasonOf(new Date());
}

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** "Q4 2026" */
export function seasonLabel(key: string) {
  const [y, q] = key.split("-");
  return `${q} ${y}`;
}

/** "okt t/m dec" */
export function seasonMonths(key: string) {
  const q = Number(key.split("-Q")[1]);
  return `${MONTHS[(q - 1) * 3]} t/m ${MONTHS[(q - 1) * 3 + 2]}`;
}

/** Dagen tot het einde van het seizoen. */
export function daysLeftInSeason(key: string) {
  const [y, q] = key.split("-Q").map(Number);
  const end = new Date(Date.UTC(q === 4 ? y + 1 : y, q === 4 ? 0 : q * 3, 1));
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}

/** Alle seizoenen waarin gespeeld is, plus het huidige; nieuwste eerst. */
export function seasonsWithData(rows: ResultRow[]) {
  const set = new Set(rows.map((r) => seasonOf(r.finished_at)));
  set.add(currentSeason());
  return [...set].sort().reverse();
}

export function filterSeason(rows: ResultRow[], season: string | "all") {
  return season === "all" ? rows : rows.filter((r) => seasonOf(r.finished_at) === season);
}

/* ---------------- Ranglijsten ---------------- */

/** Zelfde regels als de database: meeste punten, dan meeste zeges; gelijk = gedeelde plek. */
export function standings(rows: ResultRow[]): Standing[] {
  const map = new Map<string, Standing & { games: Set<string> }>();
  for (const r of rows) {
    const s =
      map.get(r.user_id) ??
      { user_id: r.user_id, played: 0, wins: 0, points: 0, games_played: 0, rank: 0, games: new Set<string>() };
    s.played += 1;
    s.wins += r.is_winner ? 1 : 0;
    s.points += r.league_points;
    s.games.add(r.game_id);
    map.set(r.user_id, s);
  }
  const list = [...map.values()].map(({ games, ...s }) => ({ ...s, games_played: games.size }));
  list.sort((a, b) => b.points - a.points || b.wins - a.wins);
  for (const s of list) {
    s.rank = 1 + list.filter((o) => o.points > s.points || (o.points === s.points && o.wins > s.wins)).length;
  }
  return list;
}

export function standingsByGame(rows: ResultRow[]) {
  const byGame = new Map<string, ResultRow[]>();
  for (const r of rows) byGame.set(r.game_id, [...(byGame.get(r.game_id) ?? []), r]);
  const out = new Map<string, Standing[]>();
  for (const [g, rs] of byGame) out.set(g, standings(rs));
  return out;
}

/** Kampioen per afgelopen seizoen (alleen bij een unieke nummer 1). */
export function seasonChampions(rows: ResultRow[]) {
  const now = currentSeason();
  const out = new Map<string, string>();
  for (const season of seasonsWithData(rows)) {
    if (season >= now) continue;
    const top = standings(filterSeason(rows, season)).filter((s) => s.rank === 1);
    if (top.length === 1) out.set(season, top[0].user_id);
  }
  return out;
}

/* ---------------- Onderlinge stand ---------------- */

export type HeadToHead = {
  opponent: string;
  wins: number;
  losses: number;
  draws: number;
  perGame: Map<string, { wins: number; losses: number; draws: number }>;
};

/** Per potje waarin beiden meededen: wie eindigde hoger? */
export function headToHead(rows: ResultRow[], me: string, opponent: string): HeadToHead {
  const byMatch = new Map<string, ResultRow[]>();
  for (const r of rows) {
    if (r.user_id === me || r.user_id === opponent) {
      byMatch.set(r.match_id, [...(byMatch.get(r.match_id) ?? []), r]);
    }
  }
  const h: HeadToHead = { opponent, wins: 0, losses: 0, draws: 0, perGame: new Map() };
  for (const rs of byMatch.values()) {
    const a = rs.find((r) => r.user_id === me);
    const b = rs.find((r) => r.user_id === opponent);
    if (!a || !b) continue;
    const g = h.perGame.get(a.game_id) ?? { wins: 0, losses: 0, draws: 0 };
    if (a.placement < b.placement) {
      h.wins++;
      g.wins++;
    } else if (a.placement > b.placement) {
      h.losses++;
      g.losses++;
    } else {
      h.draws++;
      g.draws++;
    }
    h.perGame.set(a.game_id, g);
  }
  return h;
}

export function allHeadToHeads(rows: ResultRow[], me: string) {
  const others = new Set(rows.map((r) => r.user_id).filter((u) => u !== me));
  return [...others]
    .map((o) => headToHead(rows, me, o))
    .filter((h) => h.wins + h.losses + h.draws > 0)
    .sort((a, b) => b.wins + b.losses + b.draws - (a.wins + a.losses + a.draws));
}

/* ---------------- Premie op de koploper ---------------- */

/** De unieke nummer 1 van een lijst standen (of null bij een gedeelde eerste plek). */
function uniqueLeader(table: Map<string, { points: number; wins: number }>) {
  let best: string | null = null;
  let tie = false;
  let bp = -Infinity;
  let bw = -Infinity;
  for (const [u, s] of table) {
    if (s.points > bp || (s.points === bp && s.wins > bw)) {
      best = u;
      bp = s.points;
      bw = s.wins;
      tie = false;
    } else if (s.points === bp && s.wins === bw) tie = true;
  }
  return tie || bp <= 0 ? null : best;
}

/**
 * Hoe vaak iemand de koploper van het seizoen versloeg: in een potje hoger eindigen
 * dan degene die op dat moment (vóór het potje) alleen bovenaan stond.
 */
export function bountyHits(rows: ResultRow[]) {
  const byMatch = new Map<string, ResultRow[]>();
  for (const r of rows) byMatch.set(r.match_id, [...(byMatch.get(r.match_id) ?? []), r]);
  const matches = [...byMatch.values()].sort((a, b) => a[0].finished_at.localeCompare(b[0].finished_at));
  const seasons = new Map<string, Map<string, { points: number; wins: number }>>();
  const hits = new Map<string, number>();
  for (const rs of matches) {
    const season = seasonOf(rs[0].finished_at);
    const table = seasons.get(season) ?? new Map<string, { points: number; wins: number }>();
    seasons.set(season, table);
    const leader = uniqueLeader(table);
    const lr = leader ? rs.find((r) => r.user_id === leader) : undefined;
    if (lr) {
      for (const r of rs) if (r.user_id !== leader && r.placement < lr.placement) hits.set(r.user_id, (hits.get(r.user_id) ?? 0) + 1);
    }
    for (const r of rs) {
      const s = table.get(r.user_id) ?? { points: 0, wins: 0 };
      s.points += Number(r.league_points);
      s.wins += r.is_winner ? 1 : 0;
      table.set(r.user_id, s);
    }
  }
  return hits;
}

/** Wie er nu alleen bovenaan staat dit seizoen (daar staat de premie op). */
export function currentBountyTarget(rows: ResultRow[]) {
  const top = standings(filterSeason(rows, currentSeason())).filter((s) => s.rank === 1);
  return top.length === 1 && top[0].points > 0 ? top[0].user_id : null;
}
