import "server-only";
import type { createClient } from "./supabase/server";
import { getGames, getLeaderboards, getProfiles, getResults } from "./data";
import { computeXp, getAttendance } from "./xp";
import { buildCollection, displayedCard, NICKNAMES } from "./player";
import { headToHead } from "./stats";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Alles wat de kaartenpagina's nodig hebben, in één keer opgehaald. */
export async function loadCards(supabase: DB) {
  const [profiles, games, results, attendance, boards] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
    getAttendance(supabase),
    getLeaderboards(supabase),
  ]);
  const xpOf = computeXp(results, attendance);

  function collectionFor(userId: string) {
    const xp = xpOf(userId);
    const gameTitles = boards.filter((b) => b.user_id === userId && b.rank === 1).length;
    const col = buildCollection(results, userId, games.byId, { level: xp.level, gameTitles });
    const p = profiles.byId.get(userId);
    const shown = displayedCard(col, p?.favorite_card);
    return { col, xp, shown, nickname: NICKNAMES[xp.title] ?? "THE PLAYER" };
  }

  function versus(a: string, b: string) {
    return headToHead(results, a, b);
  }

  return { profiles, games, results, xpOf, collectionFor, versus };
}
