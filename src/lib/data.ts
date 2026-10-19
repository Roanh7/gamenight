import { createClient } from "./supabase/server";
import type {
  Activity,
  Game,
  GameNight,
  LeaderboardRow,
  Match,
  MatchResult,
  OverallRow,
  Participant,
  Profile,
  Vote,
} from "./types";
import type { ResultRow } from "./stats";

type DB = Awaited<ReturnType<typeof createClient>>;

export async function getProfiles(supabase: DB) {
  const { data } = await supabase.from("profiles").select("*").order("username");
  const list = (data ?? []) as Profile[];
  return { list, byId: new Map(list.map((p) => [p.id, p])) };
}

export async function getGames(supabase: DB) {
  const { data } = await supabase.from("games").select("*").order("name");
  const list = (data ?? []) as Game[];
  return { list, byId: new Map(list.map((g) => [g.id, g])) };
}

export async function getLeaderboards(supabase: DB) {
  const { data } = await supabase
    .from("game_leaderboard")
    .select("*")
    .order("rank", { ascending: true });
  return (data ?? []) as LeaderboardRow[];
}

export async function getOverall(supabase: DB) {
  const { data } = await supabase
    .from("overall_leaderboard")
    .select("*")
    .order("rank", { ascending: true });
  return (data ?? []) as OverallRow[];
}

export async function getActivity(supabase: DB, limit = 15) {
  const { data } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}

export async function getNight(supabase: DB, id: string) {
  const [{ data: night }, { data: participants }, { data: votes }, { data: matches }, { data: dateOptions }, { data: declines }] =
    await Promise.all([
      supabase.from("game_nights").select("*").eq("id", id).maybeSingle(),
      supabase.from("participants").select("*").eq("night_id", id).order("created_at"),
      supabase.from("votes").select("*").eq("night_id", id),
      supabase.from("matches").select("*").eq("night_id", id).order("created_at"),
      supabase.from("date_options").select("id, starts_at, date_votes(user_id)").eq("night_id", id).order("starts_at"),
      supabase.from("night_declines").select("user_id, declined_at").eq("night_id", id),
    ]);
  if (!night) return null;
  const matchIds = (matches ?? []).map((m) => m.id);
  const liveIds = (matches ?? []).filter((m) => m.status === "live").map((m) => m.id);
  const [{ data: results }, { data: livePlayers }, { data: liveScores }, { data: liveTeamScores }] = await Promise.all([
    matchIds.length
      ? supabase.from("match_results").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [] }),
    matchIds.length
      ? supabase.from("match_players").select("match_id, user_id, team").in("match_id", matchIds)
      : Promise.resolve({ data: [] }),
    liveIds.length
      ? supabase.from("score_entries").select("match_id, user_id, round, points").in("match_id", liveIds)
      : Promise.resolve({ data: [] }),
    liveIds.length
      ? supabase.from("team_scores").select("match_id, team, round, points").in("match_id", liveIds)
      : Promise.resolve({ data: [] }),
  ]);
  // Live tussenstand per team (speltype "teams")
  const liveTeams = new Map<string, { team: string; total: number; members: string[] }[]>();
  for (const id of liveIds) {
    const members = ((livePlayers ?? []) as { match_id: string; user_id: string; team: string | null }[]).filter(
      (p) => p.match_id === id && p.team,
    );
    const names = [...new Set(members.map((m) => m.team as string))];
    liveTeams.set(
      id,
      names.map((team) => ({
        team,
        members: members.filter((m) => m.team === team).map((m) => m.user_id),
        total: (liveTeamScores ?? [])
          .filter((s) => s.match_id === id && s.team === team)
          .reduce((t, s) => t + Number(s.points), 0),
      })),
    );
  }
  // Rollen per potje (teamspellen)
  const teams = new Map<string, Map<string, string | null>>();
  for (const p of (livePlayers ?? []) as { match_id: string; user_id: string; team: string | null }[]) {
    const m = teams.get(p.match_id) ?? new Map<string, string | null>();
    m.set(p.user_id, p.team);
    teams.set(p.match_id, m);
  }
  // Live tussenstand per lopend potje
  const live = new Map<string, { user_id: string; total: number; rounds: number }[]>();
  for (const id of liveIds) {
    const players = (livePlayers ?? []).filter((p) => p.match_id === id);
    const scores = (liveScores ?? []).filter((s) => s.match_id === id);
    live.set(
      id,
      players.map((p) => ({
        user_id: p.user_id,
        total: scores.filter((s) => s.user_id === p.user_id).reduce((t, s) => t + Number(s.points), 0),
        rounds: Math.max(0, ...scores.map((s) => s.round)),
      })),
    );
  }
  return {
    night: night as GameNight,
    participants: (participants ?? []) as Participant[],
    /** Afgemeld (zonder dat ze nu toch aangemeld zijn) */
    declined: ((declines ?? []) as { user_id: string }[])
      .map((d) => d.user_id)
      .filter((u) => !(participants ?? []).some((p) => p.user_id === u)),
    votes: (votes ?? []) as Vote[],
    matches: (matches ?? []) as Match[],
    results: (results ?? []) as MatchResult[],
    live,
    liveTeams,
    teams,
    dateOptions: ((dateOptions ?? []) as { id: string; starts_at: string; date_votes: { user_id: string }[] }[]).map(
      (o) => ({ id: o.id, starts_at: o.starts_at, voters: o.date_votes.map((v) => v.user_id) }),
    ),
  };
}

/** Telt stemmen (iedereen mag op meerdere games stemmen). */
export function tallyVotes(votes: Vote[]) {
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.game_id, (counts.get(v.game_id) ?? 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  const top = counts.get(ranked[0]) ?? 0;
  const leaders = ranked.filter((g) => counts.get(g) === top && top > 0);
  const voters = new Set(votes.map((v) => v.user_id)).size;
  return { counts, ranked, leaders, voters, total: votes.length };
}

/**
 * De games van een avond: bij een vaste selectie de gekozen games, bij stemmen de games met stemmen
 * (meeste eerst) plus games die de host er later bij heeft gezet.
 */
export function nightGameOrder(night: { vote_mode: string; game_ids: string[] }, votes: Vote[]) {
  const extra = night.game_ids ?? [];
  if (night.vote_mode === "fixed") return extra;
  const ranked = tallyVotes(votes).ranked;
  return [...ranked, ...extra.filter((g) => !ranked.includes(g))];
}

/** Reacties per nieuwsbericht: per emoji het aantal, wie, en of ik al reageerde. */
export async function getReactions(supabase: DB, activityIds: number[], meId: string, profiles: Map<string, Profile>) {
  const out = new Map<number, Record<string, { n: number; mine: boolean; names: string[] }>>();
  if (!activityIds.length) return out;
  const { data } = await supabase.from("reactions").select("activity_id, user_id, emoji").in("activity_id", activityIds);
  for (const r of (data ?? []) as { activity_id: number; user_id: string; emoji: string }[]) {
    const m = out.get(r.activity_id) ?? {};
    const e = m[r.emoji] ?? { n: 0, mine: false, names: [] };
    e.n += 1;
    e.mine ||= r.user_id === meId;
    const name = profiles.get(r.user_id)?.username;
    if (name) e.names.push(name);
    m[r.emoji] = e;
    out.set(r.activity_id, m);
  }
  return out;
}

/** Alle afgeronde resultaten, met het moment van afronden (voor seizoenen en onderlinge stand). */
export async function getResults(supabase: DB) {
  const { data } = await supabase
    .from("match_results")
    .select("*, matches!inner(finished_at, night_id, game_nights!inner(is_practice))")
    .limit(10000);
  // Oefenavonden tellen nergens voor mee
  const real = (data ?? []).filter(
    (r) => !(r as { matches?: { game_nights?: { is_practice?: boolean } | null } }).matches?.game_nights?.is_practice,
  );
  return real.map((r) => {
    const { matches, ...rest } = r as MatchResult & { matches: { finished_at: string | null; night_id: string } };
    return {
      ...rest,
      finished_at: matches?.finished_at ?? new Date().toISOString(),
      night_id: matches?.night_id,
    } as ResultRow;
  });
}

import { COMMENT_SELECT, type CommentRow } from "./comments";
export type { CommentRow };

/** Per nieuwsbericht: hoeveel comments, plus de laatste 2 om alvast te tonen. */
export async function getComments(supabase: DB, activityIds: number[]) {
  const out = new Map<number, { count: number; latest: CommentRow[] }>();
  if (!activityIds.length) return out;
  const { data } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .in("activity_id", activityIds)
    .order("created_at", { ascending: true })
    .limit(2000);
  for (const c of (data ?? []) as unknown as CommentRow[]) {
    const e = out.get(c.activity_id) ?? { count: 0, latest: [] };
    e.count += 1;
    e.latest = [...e.latest, c].slice(-2);
    out.set(c.activity_id, e);
  }
  return out;
}

export type LiveRole = "host" | "cohost" | "player";
export type ActiveNight = { id: string; title: string; role: LiveRole; liveMatches: number; practice?: boolean };

/** De avond die nu bezig is en waar jij bij hoort (als host, co-host of bevestigde speler). */
export async function getActiveNight(supabase: DB, userId: string): Promise<ActiveNight | null> {
  const { data: nights } = await supabase
    .from("game_nights")
    .select("id, title, host_id, cohost_id, starts_at, is_practice")
    .eq("status", "live")
    .order("starts_at", { ascending: false })
    .limit(5);
  if (!nights?.length) return null;
  const ids = nights.map((n) => n.id);
  const [{ data: mine }, { data: live }] = await Promise.all([
    supabase.from("participants").select("night_id, status").eq("user_id", userId).in("night_id", ids),
    supabase.from("matches").select("night_id").eq("status", "live").in("night_id", ids),
  ]);
  for (const n of nights) {
    const role: LiveRole | null =
      n.host_id === userId
        ? "host"
        : n.cohost_id === userId
          ? "cohost"
          : !n.is_practice && (mine ?? []).some((p) => p.night_id === n.id && p.status === "confirmed")
            ? "player"
            : null;
    if (role) {
      return {
        id: n.id,
        title: n.title,
        role,
        liveMatches: (live ?? []).filter((m) => m.night_id === n.id).length,
        practice: !!n.is_practice,
      };
    }
  }
  return null;
}

/** Afmeldingen en door de host gezette aanwezigheid (📅 My Attendance). */
export async function getAttendanceExtras(supabase: DB) {
  const [{ data: declines }, { data: marks }] = await Promise.all([
    supabase.from("night_declines").select("night_id, user_id").limit(20000),
    supabase.from("night_attendance").select("night_id, user_id, present").limit(20000),
  ]);
  return {
    declines: (declines ?? []) as { night_id: string; user_id: string }[],
    marks: (marks ?? []) as { night_id: string; user_id: string; present: boolean }[],
  };
}
