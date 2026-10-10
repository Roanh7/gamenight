import type { createClient } from "./supabase/server";
import { bountyHits, type ResultRow } from "./stats";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Hoeveel XP je waarvoor krijgt (ook uitgelegd op /uitleg#xp). */
export const XP_RULES = {
  played: 10, // per potje
  win: 15, // extra bij winst
  second: 8, // extra bij een 2e plek
  third: 4, // extra bij een 3e plek
  night: 20, // per afgesloten avond waar je bij was
  hosted: 15, // per afgesloten avond die je hostte
  bounty: 10, // extra als je de koploper van het seizoen verslaat
} as const;

export type XpInfo = {
  xp: number;
  level: number;
  title: string;
  /** XP binnen het huidige level en hoeveel dat level in totaal vraagt */
  into: number;
  span: number;
  toNext: number;
};

/** Totale XP die nodig is om level n te bereiken (1 → 0, 2 → 50, 3 → 150, 4 → 300 …). */
export function xpForLevel(n: number) {
  return 25 * n * (n - 1);
}

export function levelTitle(level: number) {
  if (level >= 15) return "Grootmeester";
  if (level >= 10) return "Legende";
  if (level >= 7) return "Veteraan";
  if (level >= 5) return "Pro";
  if (level >= 3) return "Speler";
  return "Rookie";
}

export function xpInfo(xp: number): XpInfo {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { xp, level, title: levelTitle(level), into: xp - start, span: next - start, toNext: next - xp };
}

export type Attendance = { user_id: string; host_id: string; night_id: string; starts_at: string };

/** Wie was bij welke afgesloten avond (bevestigd), plus wie die avond hostte. */
export async function getAttendance(supabase: DB): Promise<Attendance[]> {
  const { data } = await supabase
    .from("participants")
    .select("user_id, night_id, game_nights!inner(status, host_id, starts_at)")
    .eq("status", "confirmed")
    .eq("game_nights.status", "finished")
    .limit(10000);
  return (
    (data ?? []) as unknown as { user_id: string; night_id: string; game_nights: { host_id: string; starts_at: string } }[]
  ).map((r) => ({
    user_id: r.user_id,
    host_id: r.game_nights.host_id,
    night_id: r.night_id,
    starts_at: r.game_nights.starts_at,
  }));
}

/** XP per speler, uitgerekend uit alle uitslagen en avonden. */
export function computeXp(results: ResultRow[], attendance: Attendance[]) {
  const xp = new Map<string, number>();
  const add = (u: string, n: number) => xp.set(u, (xp.get(u) ?? 0) + n);
  for (const r of results) {
    add(r.user_id, XP_RULES.played);
    if (r.is_winner) add(r.user_id, XP_RULES.win);
    else if (r.placement <= 2) add(r.user_id, XP_RULES.second); // ook gedeelde 1e plek
    else if (r.placement === 3) add(r.user_id, XP_RULES.third);
  }
  for (const [u, n] of bountyHits(results)) add(u, n * XP_RULES.bounty);
  for (const a of attendance) {
    add(a.user_id, XP_RULES.night);
    if (a.user_id === a.host_id) add(a.user_id, XP_RULES.hosted);
  }
  return (userId: string) => xpInfo(xp.get(userId) ?? 0);
}
