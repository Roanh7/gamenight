import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import type { Game, Match, MatchResult } from "@/lib/types";
import { deleteMatch, reopenMatch } from "../../../../actions";
import { GameIcon } from "@/components/GameIcon";
import { MatchResults } from "@/components/MatchResults";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/ui";
import { ScoreBoard } from "./ScoreBoard";

export const metadata: Metadata = { title: "Scores" };

export default async function MatchPage(props: PageProps<"/agenda/[id]/host/potje/[matchId]">) {
  const { id, matchId } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();

  const [{ data: night }, { data: matchData }, { data: mp }, { data: entries }, profiles] = await Promise.all([
    supabase.from("game_nights").select("id, title, host_id").eq("id", id).maybeSingle(),
    supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
    supabase.from("match_players").select("user_id").eq("match_id", matchId),
    supabase.from("score_entries").select("user_id, round, points").eq("match_id", matchId),
    getProfiles(supabase),
  ]);
  if (!night || !matchData || !me || matchData.night_id !== id) notFound();
  if (night.host_id !== me.user.id) redirect(`/agenda/${id}`);
  const match = matchData as Match;

  const { data: gameData } = await supabase.from("games").select("*").eq("id", match.game_id).maybeSingle();
  const game = gameData as Game | null;

  const players = (mp ?? [])
    .map((x) => profiles.byId.get(x.user_id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, username: p!.username, avatar_color: p!.avatar_color }));

  let results: MatchResult[] = [];
  if (match.status === "finished") {
    const { data } = await supabase.from("match_results").select("*").eq("match_id", matchId);
    results = (data ?? []) as MatchResult[];
  }
  const winner = match.winner_id ? profiles.byId.get(match.winner_id) : undefined;
  const teamWinners = results
    .filter((r) => r.is_winner)
    .map((r) => profiles.byId.get(r.user_id))
    .filter(Boolean) as NonNullable<ReturnType<typeof profiles.byId.get>>[];

  return (
    <div>
      <PageHeader back={`/agenda/${id}/host`} kicker={night.title.toUpperCase()} title={game?.name ?? "Potje"} action={game ? <GameIcon icon={game.icon} color={game.color} /> : null} />
      <Flash sp={sp} />

      {match.status === "live" ? (
        <>
          <ScoreBoard
            matchId={match.id}
            nightId={id}
            players={players}
            initialEntries={(entries ?? []).map((e) => ({ ...e, points: Number(e.points) }))}
            lowestWins={game?.scoring_mode === "lowest_wins"}
            isTeam={game?.is_team ?? false}
          />
          <form action={deleteMatch} className="mt-8">
            <input type="hidden" name="night_id" value={id} />
            <input type="hidden" name="match_id" value={match.id} />
            <SubmitButton className="btn btn-secondary btn-sm w-full text-red" confirm="Dit potje en de ingevoerde scores weggooien?">
              Potje weggooien
            </SubmitButton>
          </form>
        </>
      ) : (
        <>
          <section className={`card mb-4 p-6 text-center ${sp.klaar ? "animate-pop" : ""} ${winner || teamWinners.length ? "bg-yellow" : "bg-soft"}`}>
            {winner ? (
              <>
                <p className="pixel text-[10px]">WINNER!</p>
                <div className="mt-3 flex justify-center">
                  <Avatar name={winner.username} color={winner.avatar_color} size="xl" crown />
                </div>
                <p className="mt-3 text-2xl font-black">{winner.username}</p>
                <p className="text-sm font-bold">wint {game?.name}</p>
              </>
            ) : teamWinners.length > 1 ? (
              <>
                <p className="pixel text-[10px]">TEAM WINS!</p>
                <div className="mt-3 flex justify-center -space-x-2">
                  {teamWinners.map((p) => (
                    <Avatar key={p.id} name={p.username} color={p.avatar_color} size="lg" crown />
                  ))}
                </div>
                <p className="mt-3 text-xl font-black">{teamWinners.map((p) => p.username).join(" & ")}</p>
                <p className="text-sm font-bold">winnen {game?.name} samen</p>
              </>
            ) : (
              <>
                <p className="pixel text-[10px]">DRAW</p>
                <p className="mt-3 text-4xl">🤝</p>
                <p className="mt-2 text-xl font-black">Gelijkspel!</p>
                <p className="text-sm font-bold">Gelijke stand bovenaan: geen winnaar.</p>
              </>
            )}
          </section>
          <MatchResults match={match} game={game ?? undefined} results={results} profiles={profiles.byId} />
          <div className="mt-6 grid gap-2">
            <Link href={`/agenda/${id}/host`} className="btn btn-primary">
              ▶ Volgend potje
            </Link>
            <form action={reopenMatch}>
              <input type="hidden" name="night_id" value={id} />
              <input type="hidden" name="match_id" value={match.id} />
              <SubmitButton className="btn btn-secondary btn-sm w-full" confirm="Potje heropenen om scores te corrigeren? De punten gaan tijdelijk van de ranglijst af.">
                Foutje? Heropen dit potje
              </SubmitButton>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
