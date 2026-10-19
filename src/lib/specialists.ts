import type { Game } from "./types";
import type { ResultRow } from "./stats";

/**
 * 🎮 Game Specialist Rankings — per game: wie wint het vaakst?
 * Alleen statistiek: dit verandert niets aan competitiepunten, XP, underdog of de ranglijsten.
 *
 * - Een zege = `is_winner` uit de officiële uitslag (solo: de winnaar; teams en geheime rollen:
 *   iedereen in het winnende team). Gelijkspel bovenaan = geen winnaar = geen zege.
 * - Eén uitslagregel per speler per potje (de database dwingt dat af), dus nooit dubbel geteld.
 * - Oefenavonden zitten niet in de resultaten; heropende/verwijderde potjes ook niet.
 */

/** Minimaal aantal afgeronde potjes van een game voor een officiële ranking. Hier centraal aan te passen. */
export const SPECIALIST_MIN_PLAYED = 5;

export type SpecialistRow = {
  user_id: string;
  played: number;
  wins: number;
  points: number; // verdiende competitiepunten in deze game (incl. eventuele underdog-bonus)
  winrate: number; // 0–100
  rank: number | null; // null = nog niet gerankt
  form: boolean[]; // laatste (max) 5 potjes, nieuwste eerst: true = gewonnen
};

/** a beter dan b? Hoogste winpercentage, dan meeste zeges, dan meeste potjes (exact, zonder afrondfouten). */
function compare(a: SpecialistRow, b: SpecialistRow) {
  const byRate = b.wins * a.played - a.wins * b.played; // > 0 → b heeft hoger percentage
  return byRate || b.wins - a.wins || b.played - a.played;
}

/** Ranglijst voor één game: officieel (≥ minimum) en "nog niet gerankt". `rows` = resultaten van die game. */
export function specialistBoard(rows: ResultRow[], min = SPECIALIST_MIN_PLAYED) {
  const by = new Map<string, ResultRow[]>();
  for (const r of rows) by.set(r.user_id, [...(by.get(r.user_id) ?? []), r]);
  const all: SpecialistRow[] = [...by.entries()].map(([user_id, rs]) => {
    const wins = rs.filter((r) => r.is_winner).length;
    const recent = [...rs].sort((a, b) => (a.finished_at < b.finished_at ? 1 : -1)).slice(0, 5);
    return {
      user_id,
      played: rs.length,
      wins,
      points: rs.reduce((t, r) => t + Number(r.league_points), 0),
      winrate: rs.length ? (wins / rs.length) * 100 : 0,
      rank: null,
      form: recent.map((r) => r.is_winner),
    };
  });
  const ranked = all.filter((s) => s.played >= min).sort(compare);
  for (const s of ranked) s.rank = 1 + ranked.filter((o) => compare(o, s) < 0).length; // gelijk op alles = gedeelde plek
  const unranked = all.filter((s) => s.played < min).sort((a, b) => b.played - a.played || compare(a, b));
  return { ranked, unranked };
}

/** Per game de ranglijst (alleen games met resultaten). */
export function specialistBoards(rows: ResultRow[], min = SPECIALIST_MIN_PLAYED) {
  const byGame = new Map<string, ResultRow[]>();
  for (const r of rows) byGame.set(r.game_id, [...(byGame.get(r.game_id) ?? []), r]);
  const out = new Map<string, ReturnType<typeof specialistBoard>>();
  for (const [g, rs] of byGame) out.set(g, specialistBoard(rs, min));
  return out;
}

/** "SMASH MASTER", "30 SECONDS KING", "WOLVEN SPECIALIST" — automatisch, ook voor nieuwe games. */
export function specialistTitle(game: Pick<Game, "name" | "game_type" | "is_team">) {
  const type = game.game_type ?? (game.is_team ? "roles" : "solo");
  const suffix = type === "teams" ? "KING" : type === "roles" ? "SPECIALIST" : "MASTER";
  return `${game.name.trim().toUpperCase()} ${suffix}`;
}

/** Houders van de specialisttitel: de officiële nummer 1 (of gedeelde nummers 1) van de all-time ranglijst. */
export function titleHolders(board: ReturnType<typeof specialistBoard> | undefined) {
  return (board?.ranked ?? []).filter((s) => s.rank === 1);
}

/** Alle specialisttitels van één speler (all-time). */
export function titlesOf(userId: string, allBoards: Map<string, ReturnType<typeof specialistBoard>>, games: Map<string, Game>) {
  const out: { game: Game; title: string }[] = [];
  for (const [gid, board] of allBoards) {
    const g = games.get(gid);
    if (g && titleHolders(board).some((s) => s.user_id === userId)) out.push({ game: g, title: specialistTitle(g) });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Beste game van een speler: alleen games waarin hij officieel gerankt is (≥ minimum potjes),
 * hoogste winpercentage, dan meeste zeges, dan meeste potjes. Gelijk op alles → allebei.
 */
export function bestGames(userId: string, allBoards: Map<string, ReturnType<typeof specialistBoard>>) {
  const mine = [...allBoards.entries()]
    .map(([game_id, b]) => ({ game_id, row: b.ranked.find((s) => s.user_id === userId) }))
    .filter((x): x is { game_id: string; row: SpecialistRow } => !!x.row);
  if (!mine.length) return [];
  mine.sort((a, b) => compare(a.row, b.row));
  return mine.filter((x) => compare(x.row, mine[0].row) === 0);
}

/** 72 / 62,5 — maximaal één decimaal, Nederlandse komma. */
export function formatRate(rate: number) {
  const r = Math.round(rate * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace(".", ",");
}
