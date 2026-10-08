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
  const { data: results } = matchIds.length
    ? await supabase.from("match_results").select("*").in("match_id", matchIds)
    : { data: [] };
  return {
    night: night as GameNight,
    participants: (participants ?? []) as Participant[],
    votes: (votes ?? []) as Vote[],
    matches: (matches ?? []) as Match[],
    results: (results ?? []) as MatchResult[],
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
