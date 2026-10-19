import type { ResultRow, Standing } from "./stats";

/**
 * Underdog Bonus 🐺
 * Zelfde regels als de database (supabase/migrations/0019_underdog.sql). De database is leidend:
 * die legt de status vast bij de start van een potje en kent de bonus toe. Deze kopie is alleen
 * om de 🐺-badge te tonen.
 */
export const UNDERDOG_BONUS = 2;
export const UNDERDOG_MIN_GAP = 10;
export const UNDERDOG_PCT = 20; // procent

export type UnderdogInfo = {
  user_id: string;
  rank: number;
  points: number;
  ref_points: number;
  threshold: number;
  bonus: number;
};

/** Vereiste achterstand: minimaal 10, of 20% van de (positieve) punten van de nummer drie van onderen. */
export function underdogThreshold(refPoints: number) {
  // (punten × 20) / 100 i.p.v. × 0,2: voorkomt afrondfoutjes (0,2 × 150 = 30,000000000000004)
  return Math.ceil(Math.max(UNDERDOG_MIN_GAP, (Math.max(refPoints, 0) * UNDERDOG_PCT) / 100));
}

/** Wie is nu underdog? `list` = de seizoensranglijst (standings van het huidige seizoen). */
export function underdogs(list: Standing[]): Map<string, UnderdogInfo> {
  const out = new Map<string, UnderdogInfo>();
  const n = list.length;
  if (n < 4) return out;
  const sorted = [...list].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0),
  );
  const ref = sorted[n - 3];
  const threshold = underdogThreshold(ref.points);
  for (const s of sorted.slice(n - 2)) {
    if (ref.points - s.points >= threshold) {
      out.set(s.user_id, { user_id: s.user_id, rank: s.rank, points: s.points, ref_points: ref.points, threshold, bonus: UNDERDOG_BONUS });
    }
  }
  return out;
}

export type UnderdogTally = { user_id: string; wins: number; bonus: number; nights: number };

/** Hoe vaak won iemand als underdog, en hoeveel bonuspunten leverde dat op? Meeste zeges eerst. */
export function underdogTally(rows: ResultRow[]): UnderdogTally[] {
  const map = new Map<string, { wins: number; bonus: number; nights: Set<string> }>();
  for (const r of rows) {
    const b = r.underdog_bonus ?? 0;
    if (b <= 0) continue;
    const t = map.get(r.user_id) ?? { wins: 0, bonus: 0, nights: new Set<string>() };
    t.wins += 1;
    t.bonus += b;
    if (r.night_id) t.nights.add(r.night_id);
    map.set(r.user_id, t);
  }
  return [...map.entries()]
    .map(([user_id, t]) => ({ user_id, wins: t.wins, bonus: t.bonus, nights: t.nights.size }))
    .sort((a, b) => b.wins - a.wins || b.bonus - a.bonus);
}

/** Alle underdog-zeges, nieuwste eerst (voor "op welke avond"). */
export function underdogWins(rows: ResultRow[]) {
  return rows
    .filter((r) => (r.underdog_bonus ?? 0) > 0)
    .sort((a, b) => (a.finished_at < b.finished_at ? 1 : -1));
}
