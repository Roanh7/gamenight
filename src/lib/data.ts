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
  const [{ data: night }, { data: participants }, { data: votes }, { data: matches }] =
    await Promise.all([
      supabase.from("game_nights").select("*").eq("id", id).maybeSingle(),
      supabase.from("participants").select("*").eq("night_id", id).order("created_at"),
      supabase.from("votes").select("*").eq("night_id", id),
      supabase.from("matches").select("*").eq("night_id", id).order("created_at"),
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
    votes: (votes ?? []) as Vote[],
    matches: (matches ?? []) as Match[],
    results: (results ?? []) as MatchResult[],
    live,
    liveTeams,
    teams,
  };
}

/** Telt stemmen en bepaalt de leider (null bij gelijke stand of geen stemmen). */
export function tallyVotes(votes: Vote[]) {
  const counts = new Map<string, number>();
  for (const v of votes) counts.set(v.game_id, (counts.get(v.game_id) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[1] ?? 0;
  const leaders = sorted.filter(([, c]) => c === top && top > 0).map(([g]) => g);
  return { counts, leaders, winner: leaders.length === 1 ? leaders[0] : null, total: votes.length };
}

/** Alle afgeronde resultaten, met het moment van afronden (voor seizoenen en onderlinge stand). */
export async function getResults(supabase: DB) {
  const { data } = await supabase
    .from("match_results")
    .select("*, matches!inner(finished_at)")
    .limit(10000);
  return (data ?? []).map((r) => {
    const { matches, ...rest } = r as MatchResult & { matches: { finished_at: string | null } };
    return { ...rest, finished_at: matches?.finished_at ?? new Date().toISOString() } as ResultRow;
  });
}
