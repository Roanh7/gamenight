import "server-only";
import type { createClient } from "./supabase/server";
import { getGames, getLeaderboards, getProfiles, getResults } from "./data";
import { computeXp, getAttendance } from "./xp";
import { buildCollection, displayedCard, NICKNAMES, type CardStats, type EditionId } from "./player";
import { safeStyle, type CardStyle, type CardView } from "./cardStyles";
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

  /** Een kaart klaar om te tekenen; standaard de kaart die iemand zelf laat zien. */
  function view(
    userId: string,
    o: { edition?: EditionId; stats?: CardStats; season?: string | null; nickname?: string; style?: CardStyle } = {},
  ): CardView {
    const c = collectionFor(userId);
    const p = profiles.byId.get(userId);
    const stats = o.stats ?? c.shown.stats;
    const g = (id: string) => games.byId.get(id);
    return {
      name: p?.username ?? "?",
      color: p?.avatar_color ?? null,
      emoji: p?.avatar_emoji ?? null,
      style: o.style ?? safeStyle(p?.card_style),
      nickname: o.nickname ?? c.nickname,
      level: c.xp.level,
      edition: o.edition ?? c.shown.edition,
      season: o.season !== undefined ? o.season : o.stats ? null : c.shown.season,
      stats,
      top: (stats.top ?? []).flatMap((t) => {
        const x = g(t.game);
        return x ? [{ icon: x.icon, name: x.name, wins: t.wins }] : [];
      }),
      weak: stats.weak && g(stats.weak) ? { icon: g(stats.weak)!.icon, name: g(stats.weak)!.name } : null,
    };
  }

  return { profiles, games, results, xpOf, collectionFor, versus, view };
}
