import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import type { Game, Match, MatchResult, MatchUnderdog } from "@/lib/types";
import { UnderdogActive } from "@/components/Underdog";
import { UnderdogVictory } from "@/components/UnderdogVictory";
import { deleteMatch, rematch, reopenMatch } from "../../../../actions";
import { GameIcon } from "@/components/GameIcon";
import { MatchResults } from "@/components/MatchResults";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/ui";
import { ScoreBoard } from "./ScoreBoard";
import { Celebrate } from "@/components/Celebrate";
import { TeamResult } from "./TeamResult";
import { TeamScoreBoard } from "./TeamScoreBoard";

export const metadata: Metadata = { title: "Scores" };

export default async function MatchPage(props: PageProps<"/agenda/[id]/host/potje/[matchId]">) {
  const { id, matchId } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();

  const [{ data: night }, { data: matchData }, { data: mp }, { data: entries }, profiles, { data: udData }] = await Promise.all([
    supabase.from("game_nights").select("id, title, host_id, cohost_id").eq("id", id).maybeSingle(),
    supabase.from("matches").select("*").eq("id", matchId).maybeSingle(),
    supabase.from("match_players").select("user_id, team").eq("match_id", matchId),
    supabase.from("score_entries").select("user_id, round, points, version").eq("match_id", matchId),
    getProfiles(supabase),
    supabase.from("match_underdogs").select("*").eq("match_id", matchId),
  ]);
  if (!night || !matchData || !me || matchData.night_id !== id) notFound();
  if (night.host_id !== me.user.id && night.cohost_id !== me.user.id) redirect(`/agenda/${id}`);
  const match = matchData as Match;

  const [{ data: gameData }, { data: teamScores }] = await Promise.all([
    supabase.from("games").select("*").eq("id", match.game_id).maybeSingle(),
    supabase.from("team_scores").select("team, round, points, version").eq("match_id", matchId),
  ]);
  const game = gameData as Game | null;
  const gameType = game?.game_type ?? (game?.is_team ? "roles" : "solo");

  const players = (mp ?? [])
    .filter((x) => profiles.byId.has(x.user_id))
    .map((x) => {
      const p = profiles.byId.get(x.user_id)!;
      return { id: p.id, username: p.username, avatar_color: p.avatar_color, avatar_url: p.avatar_url, avatar_emoji: p.avatar_emoji, team: (x.team as string | null) ?? null };
    });
  const teamOf = new Map(players.map((p) => [p.id, p.team]));
  const people = Object.fromEntries(profiles.list.map((p) => [p.id, p.username]));

  let results: MatchResult[] = [];
  if (match.status === "finished") {
    const { data } = await supabase.from("match_results").select("*").eq("match_id", matchId);
    results = (data ?? []) as MatchResult[];
  }
  // 🐺 Underdogs van dit potje, vastgelegd bij de start (alleen wie echt meedoet)
  const udActive = ((udData ?? []) as MatchUnderdog[])
    .filter((u) => players.some((p) => p.id === u.user_id) && profiles.byId.has(u.user_id))
    .map((u) => ({ profile: profiles.byId.get(u.user_id)!, bonus: u.bonus }));
  const udWinners = results
    .filter((r) => (r.underdog_bonus ?? 0) > 0)
    .map((r) => ({ name: profiles.byId.get(r.user_id)?.username ?? "Speler", bonus: r.underdog_bonus ?? 0 }));
  const winner = match.winner_id ? profiles.byId.get(match.winner_id) : undefined;
  const teamWinners = results
    .filter((r) => r.is_winner)
    .map((r) => profiles.byId.get(r.user_id))
    .filter(Boolean) as NonNullable<ReturnType<typeof profiles.byId.get>>[];

  return (
    <div>
      <PageHeader back="/live" kicker={night.title.toUpperCase()} title={game?.name ?? "Potje"} action={game ? <GameIcon icon={game.icon} color={game.color} /> : null} />
      <Flash sp={sp} />

      {match.status === "live" ? (
        <>
          <UnderdogActive players={udActive} note="Vastgelegd bij de start van dit potje. De bonus gaat er pas bij als de uitslag is opgeslagen." />
          {gameType === "teams" ? (
            <TeamScoreBoard
              matchId={match.id}
              nightId={id}
              players={players}
              teamNames={(game?.teams ?? []).map((t) => t.name)}
              initialEntries={(teamScores ?? []).map((e) => ({ ...e, points: e.points == null ? null : Number(e.points) }))}
              lowestWins={game?.scoring_mode === "lowest_wins"}
              label={`${game?.name ?? "Potje"} · ${night.title}`}
              people={people}
            />
          ) : gameType === "roles" && game ? (
            <TeamResult
              matchId={match.id}
              nightId={id}
              players={players}
              teams={game.teams ?? []}
              participationPoints={game.participation_points}
            />
          ) : (
          <ScoreBoard
            matchId={match.id}
            nightId={id}
            players={players}
            initialEntries={(entries ?? []).map((e) => ({ ...e, points: e.points == null ? null : Number(e.points) }))}
            label={`${game?.name ?? "Potje"} · ${night.title}`}
            people={people}
            lowestWins={game?.scoring_mode === "lowest_wins"}
            isTeam={false}
            gameId={game?.id}
          />
          )}
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
          {sp.klaar && <Celebrate kind={winner || teamWinners.length ? "win" : "draw"} />}
          <section className={`card mb-4 p-6 text-center ${sp.klaar ? "animate-pop" : ""} ${winner || teamWinners.length ? "bg-yellow" : "bg-soft"}`}>
            {winner ? (
              <>
                <p className="pixel text-[10px]">WINNER!</p>
                <div className="mt-3 flex justify-center">
                  <Avatar name={winner.username} color={winner.avatar_color} url={winner.avatar_url} emoji={winner.avatar_emoji} size="xl" crown />
                </div>
                <p className="mt-3 text-2xl font-black">{winner.username}</p>
                <p className="text-sm font-bold">
                  wint {game?.name}
                  {match.winning_team ? ` als ${match.winning_team}` : ""}
                </p>
              </>
            ) : teamWinners.length > 1 || match.winning_team ? (
              <>
                <p className="pixel text-[10px]">{match.winning_team ? `${match.winning_team.toUpperCase()} WINNEN!` : "TEAM WINS!"}</p>
                <div className="mt-3 flex justify-center -space-x-2">
                  {teamWinners.map((p) => (
                    <Avatar key={p.id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="lg" crown />
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
          {udWinners.length > 0 && (
            <UnderdogVictory names={udWinners.map((u) => u.name)} bonus={Math.max(...udWinners.map((u) => u.bonus))} fresh={!!sp.klaar} />
          )}
          <MatchResults match={match} game={game ?? undefined} results={results} profiles={profiles.byId} teams={teamOf} />
          <div className="mt-6 grid gap-2">
            <form action={rematch} className="card bg-night p-3 text-white">
              <input type="hidden" name="night_id" value={id} />
              <input type="hidden" name="match_id" value={match.id} />
              <div className="mb-3 flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  {players.slice(0, 8).map((p) => (
                    <Avatar key={p.id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" />
                  ))}
                </div>
                <p className="min-w-0 flex-1 text-xs font-bold opacity-80">
                  {game?.name ?? "Zelfde spel"} · {players.length} spelers
                  {gameType === "teams" ? " · zelfde teams" : ""}
                </p>
              </div>
              <SubmitButton className="btn btn-primary w-full py-4 text-lg" pendingText="Rematch starten…">
                🔁 Rematch
              </SubmitButton>
            </form>
            <Link href={`/agenda/${id}/host#potje`} className="btn btn-secondary">
              ▶ Ander potje kiezen
            </Link>
            <Link href="/live" className="btn btn-secondary">
              ← Terug naar de avond
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
