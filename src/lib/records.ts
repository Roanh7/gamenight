import type { Game } from "./types";
import { bountyHits, type ResultRow } from "./stats";
import type { Attendance } from "./xp";

export type RecordEntry = {
  id: string;
  emoji: string;
  title: string;
  /** Uitleg in één zinnetje */
  hint: string;
  holders: string[]; // user ids (meerdere bij een gedeeld record)
  value: number;
  unit: string;
};

/** De hoogste waarde en iedereen die die waarde heeft. */
function top(map: Map<string, number>) {
  let best = 0;
  for (const v of map.values()) best = Math.max(best, v);
  return { value: best, holders: best > 0 ? [...map].filter(([, v]) => v === best).map(([u]) => u) : [] };
}

function count<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const i of items) {
    const k = key(i);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Langste reeks per speler in een rij momenten (bijv. potjes of avonden), op volgorde. */
function longestStreak(perUser: Map<string, boolean[]>) {
  const out = new Map<string, number>();
  for (const [u, list] of perUser) {
    let cur = 0;
    let best = 0;
    for (const hit of list) {
      cur = hit ? cur + 1 : 0;
      best = Math.max(best, cur);
    }
    out.set(u, best);
  }
  return out;
}

export function computeRecords(results: ResultRow[], attendance: Attendance[], xpOf: (u: string) => { xp: number }) {
  const sorted = [...results].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const users = [...new Set([...results.map((r) => r.user_id), ...attendance.map((a) => a.user_id)])];

  // Winstreeks: opeenvolgende gewonnen potjes (van de potjes waarin je meespeelde)
  const winSeq = new Map<string, boolean[]>();
  for (const r of sorted) winSeq.set(r.user_id, [...(winSeq.get(r.user_id) ?? []), r.is_winner]);

  // Punten per avond en MVP per avond
  const perNight = new Map<string, Map<string, number>>();
  for (const r of results) {
    if (!r.night_id) continue;
    const m = perNight.get(r.night_id) ?? new Map<string, number>();
    m.set(r.user_id, (m.get(r.user_id) ?? 0) + Number(r.league_points));
    perNight.set(r.night_id, m);
  }
  const bestNight = new Map<string, number>();
  const mvps = new Map<string, number>();
  for (const m of perNight.values()) {
    for (const [u, p] of m) bestNight.set(u, Math.max(bestNight.get(u) ?? 0, p));
    const t = top(m);
    if (t.holders.length === 1) mvps.set(t.holders[0], (mvps.get(t.holders[0]) ?? 0) + 1);
  }

  // Aanwezigheid op volgorde van de afgesloten avonden
  const nights = [...new Map(attendance.map((a) => [a.night_id, a.starts_at])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const attended = new Set(attendance.map((a) => `${a.night_id}|${a.user_id}`));
  const attendSeq = new Map<string, boolean[]>();
  for (const u of users) attendSeq.set(u, nights.map(([n]) => attended.has(`${n}|${u}`)));
  const hosted = new Map<string, number>();
  for (const [n] of nights) {
    const h = attendance.find((a) => a.night_id === n)?.host_id;
    if (h) hosted.set(h, (hosted.get(h) ?? 0) + 1);
  }

  // Vaakst laatst
  const maxPlace = new Map<string, number>();
  for (const r of results) maxPlace.set(r.match_id, Math.max(maxPlace.get(r.match_id) ?? 0, r.placement));
  const last = count(results, (r) => (r.placement > 1 && r.placement === maxPlace.get(r.match_id) ? r.user_id : null));

  const xp = new Map(users.map((u) => [u, xpOf(u).xp]));

  const list: RecordEntry[] = [
    { id: "wins", emoji: "🏆", title: "Meeste zeges", hint: "Gewonnen potjes, alle games bij elkaar", unit: "zeges", ...top(count(results, (r) => (r.is_winner ? r.user_id : null))) },
    { id: "streak", emoji: "🔥", title: "Langste winstreeks", hint: "Zoveel potjes op rij gewonnen", unit: "op rij", ...top(longestStreak(winSeq)) },
    { id: "night", emoji: "⭐", title: "Beste avond ooit", hint: "Meeste punten op één gamenight", unit: "punten", ...top(bestNight) },
    { id: "mvp", emoji: "👑", title: "Vaakst MVP", hint: "Alleen bovenaan geëindigd op een avond", unit: "keer", ...top(mvps) },
    { id: "played", emoji: "🎮", title: "Meeste potjes", hint: "Gespeelde potjes, alle games bij elkaar", unit: "potjes", ...top(count(results, (r) => r.user_id)) },
    { id: "nights", emoji: "📅", title: "Meeste avonden", hint: "Bij zoveel afgesloten gamenights geweest", unit: "avonden", ...top(count(attendance, (a) => a.user_id)) },
    { id: "attend-streak", emoji: "🔁", title: "Trouwste speler", hint: "Zoveel gamenights op rij aanwezig", unit: "op rij", ...top(longestStreak(attendSeq)) },
    { id: "host", emoji: "🏠", title: "Gastheer aller tijden", hint: "Meeste gamenights gehost", unit: "avonden", ...top(hosted) },
    { id: "bounty", emoji: "🎯", title: "Reuzendoder", hint: "Vaakst de koploper van het seizoen verslagen", unit: "keer", ...top(bountyHits(results)) },
    { id: "xp", emoji: "⚡", title: "Meeste XP", hint: "Hoogste level van de groep", unit: "XP", ...top(xp) },
    { id: "last", emoji: "🧂", title: "Pechvogel aller tijden", hint: "Vaakst als laatste geëindigd", unit: "keer", ...top(last) },
  ];
  return list;
}

export type GameRecord = { game: Game; holders: string[]; value: number; at: string };

/** Beste score ooit per game (hoogste, of laagste als laag wint). Alleen voor ieder-voor-zich games. */
export function gameRecords(results: ResultRow[], games: Game[]) {
  const out: GameRecord[] = [];
  for (const g of games) {
    if (g.game_type !== "solo") continue;
    const rs = results.filter((r) => r.game_id === g.id);
    if (!rs.length) continue;
    const vals = rs.map((r) => Number(r.total));
    const best = g.scoring_mode === "lowest_wins" ? Math.min(...vals) : Math.max(...vals);
    const hits = rs.filter((r) => Number(r.total) === best).sort((a, b) => a.finished_at.localeCompare(b.finished_at));
    out.push({ game: g, holders: [...new Set(hits.map((h) => h.user_id))], value: best, at: hits[0].finished_at });
  }
  return out;
}
