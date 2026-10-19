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

/**
 * Wie was er ECHT bij welke afgesloten avond, plus wie die avond hostte.
 * Zelfde regel als My Attendance (src/lib/attendance.ts):
 *  - de avond telt als hij is afgesloten, geen oefenavond is en er minstens één potje is afgerond;
 *  - aanwezig = minstens één afgerond potje gespeeld, of door de host/co-host op "aanwezig" gezet.
 * Alleen aangemeld/bevestigd en niet gekomen telt dus niet (geen XP, records of banner).
 */
export function presentAttendance(
  nights: { id: string; host_id: string; starts_at: string }[],
  results: { night_id: string | null | undefined; user_id: string }[],
  marks: { night_id: string; user_id: string; present: boolean }[],
): Attendance[] {
  const present = new Map<string, Set<string>>(); // avond → spelers
  const add = (n: string, u: string) => present.set(n, (present.get(n) ?? new Set()).add(u));
  for (const r of results) if (r.night_id) add(r.night_id, r.user_id);
  const relevant = new Set(present.keys()); // avonden met minstens één afgerond potje
  for (const m of marks) if (m.present && relevant.has(m.night_id)) add(m.night_id, m.user_id);
  const out: Attendance[] = [];
  for (const n of nights) {
    for (const u of present.get(n.id) ?? []) out.push({ user_id: u, host_id: n.host_id, night_id: n.id, starts_at: n.starts_at });
  }
  return out;
}

export async function getAttendance(supabase: DB): Promise<Attendance[]> {
  const [{ data: nights }, { data: res }, { data: marks }] = await Promise.all([
    supabase.from("game_nights").select("id, host_id, starts_at").eq("status", "finished").eq("is_practice", false).limit(5000),
    supabase.from("match_results").select("user_id, matches!inner(night_id)").limit(20000),
    supabase.from("night_attendance").select("night_id, user_id, present").eq("present", true).limit(20000),
  ]);
  const results = ((res ?? []) as unknown as { user_id: string; matches: { night_id: string } | null }[]).map((r) => ({
    user_id: r.user_id,
    night_id: r.matches?.night_id,
  }));
  return presentAttendance(
    (nights ?? []) as { id: string; host_id: string; starts_at: string }[],
    results,
    (marks ?? []) as { night_id: string; user_id: string; present: boolean }[],
  );
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
