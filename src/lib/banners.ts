import { longestStreak } from "./records";
import { seasonChampions, type ResultRow } from "./stats";
import type { Attendance } from "./xp";

/* ------------------------------------------------------------------ */
/* Vrijspeelbare profielbanners (alleen cosmetisch).                   */
/* Een nieuwe banner toevoegen = één regel in BANNERS + een tekening   */
/* in src/components/Banner.tsx. De rest gaat vanzelf.                 */
/* ------------------------------------------------------------------ */

export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export const RARITY: Record<Rarity, { label: string; order: number; announce: boolean }> = {
  common: { label: "COMMON", order: 0, announce: false },
  rare: { label: "RARE", order: 1, announce: false },
  epic: { label: "EPIC", order: 2, announce: true },
  legendary: { label: "LEGENDARY", order: 3, announce: true },
  mythic: { label: "MYTHIC", order: 4, announce: true },
};

/** Herbruikbare voorwaarden. Allemaal "over je hele geschiedenis", dus ze gaan nooit omlaag door gewoon te spelen. */
export type Condition =
  | { kind: "default" }
  | { kind: "nights"; n: number } // afgesloten gamenights waar je bij was
  | { kind: "wins"; n: number } // gewonnen potjes
  | { kind: "played"; n: number } // gespeelde potjes
  | { kind: "streak"; n: number } // ooit zoveel potjes op rij gewonnen
  | { kind: "last"; n: number } // zo vaak als laatste geëindigd
  | { kind: "level"; n: number } // level bereikt
  | { kind: "seasons"; n: number }; // seizoenen gewonnen

export type BannerDef = {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  condition: Condition;
  /** Hoe je hem krijgt, in gewone taal */
  how: string;
  /** Korte sfeeromschrijving */
  description: string;
};

export const DEFAULT_BANNER = "rookie-fields";

export const BANNERS: BannerDef[] = [
  { id: "rookie-fields", name: "Rookie Fields", emoji: "🌿", rarity: "common", condition: { kind: "default" }, how: "Heeft iedereen", description: "Groene heuvels, blauwe lucht. Waar elk avontuur begint." },
  { id: "midnight-gamer", name: "Midnight Gamer", emoji: "🌙", rarity: "common", condition: { kind: "nights", n: 5 }, how: "Wees bij 5 afgesloten gamenights", description: "Sterren, een volle maan en nog één potje." },
  { id: "inferno", name: "Inferno", emoji: "🔥", rarity: "rare", condition: { kind: "wins", n: 10 }, how: "Win 10 potjes", description: "Een vulkaan vol gloeiende lava." },
  { id: "thunderstorm", name: "Thunderstorm", emoji: "⚡", rarity: "rare", condition: { kind: "streak", n: 3 }, how: "Win 3 potjes op rij", description: "Paarse lucht, donderwolken en bliksem." },
  { id: "graveyard", name: "Graveyard", emoji: "💀", rarity: "rare", condition: { kind: "last", n: 10 }, how: "Eindig 10 keer als laatste", description: "Voor wie vaak onderaan eindigt. Met liefde." },
  { id: "cosmic-legend", name: "Cosmic Legend", emoji: "🌌", rarity: "epic", condition: { kind: "level", n: 10 }, how: "Bereik level 10 (Legende)", description: "Planeten, nevels en twinkelende sterren." },
  { id: "dragons-lair", name: "Dragon's Lair", emoji: "🐉", rarity: "epic", condition: { kind: "played", n: 250 }, how: "Speel 250 potjes", description: "Een drakengrot vol goud. Hij kijkt naar je." },
  { id: "royal-champion", name: "Royal Champion", emoji: "👑", rarity: "legendary", condition: { kind: "seasons", n: 1 }, how: "Word seizoenskampioen", description: "Een gouden troonzaal met koninklijke vlaggen." },
  { id: "diamond-arena", name: "Diamond Arena", emoji: "💎", rarity: "legendary", condition: { kind: "wins", n: 100 }, how: "Win 100 potjes", description: "Een arena van glinsterend kristal." },
  { id: "hall-of-fame", name: "Hall of Fame", emoji: "🏆", rarity: "mythic", condition: { kind: "seasons", n: 3 }, how: "Word 3 keer seizoenskampioen", description: "De gouden hal van de allergrootsten." },
];

export const BANNER_BY_ID = new Map(BANNERS.map((b) => [b.id, b]));

export function bannerDef(id: string | null | undefined) {
  return BANNER_BY_ID.get(id ?? "") ?? BANNER_BY_ID.get(DEFAULT_BANNER)!;
}

/** Alles wat de voorwaarden nodig hebben, per speler. */
export type BannerStats = {
  nights: number;
  wins: number;
  played: number;
  streak: number;
  last: number;
  level: number;
  seasons: number;
};

/**
 * Rekent per speler de cijfers uit, met dezelfde definities als de rest van de app
 * (recordboek, XP, seizoenskampioenen). Oefenavonden zitten al niet in results/attendance.
 */
export function bannerStats(results: ResultRow[], attendance: Attendance[], levelOf: (u: string) => number) {
  const users = new Set([...results.map((r) => r.user_id), ...attendance.map((a) => a.user_id)]);
  const sorted = [...results].sort((a, b) => a.finished_at.localeCompare(b.finished_at) || a.match_id.localeCompare(b.match_id));
  const winSeq = new Map<string, boolean[]>();
  for (const r of sorted) winSeq.set(r.user_id, [...(winSeq.get(r.user_id) ?? []), r.is_winner]);
  const streaks = longestStreak(winSeq);
  const maxPlace = new Map<string, number>();
  for (const r of results) maxPlace.set(r.match_id, Math.max(maxPlace.get(r.match_id) ?? 0, r.placement));
  const champs = [...seasonChampions(results).values()];

  const out = new Map<string, BannerStats>();
  const get = (u: string) => {
    let s = out.get(u);
    if (!s) {
      s = { nights: 0, wins: 0, played: 0, streak: streaks.get(u) ?? 0, last: 0, level: levelOf(u), seasons: champs.filter((c) => c === u).length };
      out.set(u, s);
    }
    return s;
  };
  for (const u of users) get(u);
  for (const r of results) {
    const s = get(r.user_id);
    s.played += 1;
    if (r.is_winner) s.wins += 1;
    if (r.placement > 1 && r.placement === maxPlace.get(r.match_id)) s.last += 1;
  }
  for (const a of attendance) get(a.user_id).nights += 1;
  return (u: string): BannerStats => out.get(u) ?? { nights: 0, wins: 0, played: 0, streak: 0, last: 0, level: levelOf(u), seasons: 0 };
}

/** Voortgang richting een banner: hoeveel je hebt en hoeveel nodig is. */
export function progress(def: BannerDef, s: BannerStats) {
  const c = def.condition;
  if (c.kind === "default") return { have: 1, need: 1, done: true };
  const have = s[c.kind];
  return { have: Math.min(have, c.n), need: c.n, done: have >= c.n };
}

export function earnedIds(s: BannerStats) {
  return BANNERS.filter((b) => progress(b, s).done).map((b) => b.id);
}

/** Wat er moet veranderen in de database: nieuw vrij te spelen en (na correcties) in te trekken. */
export function bannerDiff(
  users: string[],
  statsOf: (u: string) => BannerStats,
  stored: { user_id: string; banner_id: string; revoked_at: string | null }[],
) {
  const have = new Map<string, Map<string, boolean>>(); // user → banner → actief?
  for (const r of stored) {
    const m = have.get(r.user_id) ?? new Map<string, boolean>();
    m.set(r.banner_id, !r.revoked_at);
    have.set(r.user_id, m);
  }
  const grant: { user_id: string; banner_id: string; announce: boolean; name: string; rarity: Rarity; emoji: string }[] = [];
  const revoke: { user_id: string; banner_id: string }[] = [];
  for (const u of users) {
    const earned = new Set(earnedIds(statsOf(u)).filter((id) => id !== DEFAULT_BANNER));
    const mine = have.get(u) ?? new Map<string, boolean>();
    for (const id of earned) {
      if (mine.get(id) !== true) {
        const d = BANNER_BY_ID.get(id)!;
        grant.push({ user_id: u, banner_id: id, announce: RARITY[d.rarity].announce, name: d.name, rarity: d.rarity, emoji: d.emoji });
      }
    }
    for (const [id, active] of mine) {
      // Alleen banners die we kennen; een onbekende (oude) banner laten we met rust
      if (active && BANNER_BY_ID.has(id) && !earned.has(id)) revoke.push({ user_id: u, banner_id: id });
    }
  }
  return { grant, revoke };
}
