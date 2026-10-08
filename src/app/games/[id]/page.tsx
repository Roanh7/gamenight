import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { History, Pencil, ScrollText, Trophy } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles, getResults } from "@/lib/data";
import type { Game, Match } from "@/lib/types";
import { filterSeason, seasonLabel, seasonsWithData, standings } from "@/lib/stats";
import { SeasonTabs, parseSeason } from "@/components/SeasonTabs";
import { formatDateShort, formatScore } from "@/lib/format";
import { GameIcon } from "@/components/GameIcon";
import { Leaderboard } from "@/components/Leaderboard";
import { Avatar } from "@/components/Avatar";
import { Flash } from "@/components/Flash";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Game" };

export default async function GamePage(props: PageProps<"/games/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: gameData }, allResults, { data: matchData }, profiles] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    getResults(supabase),
    supabase
      .from("matches")
      .select("*")
      .eq("game_id", id)
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(20),
    getProfiles(supabase),
  ]);
  if (!gameData) notFound();
  const game = gameData as Game;
  const gameResults = allResults.filter((r) => r.game_id === id);
  const seasons = seasonsWithData(gameResults);
  const season = parseSeason(sp.seizoen, seasons);
  const rows = standings(filterSeason(gameResults, season));
  const matches = (matchData ?? []) as Match[];
  const creator = game.created_by ? profiles.byId.get(game.created_by) : undefined;

  // Hoogste/laagste score ooit
  const { data: best } = await supabase
    .from("match_results")
    .select("user_id, total")
    .eq("game_id", id)
    .order("total", { ascending: game.scoring_mode === "lowest_wins" })
    .limit(1);
  const record = best?.[0];
  const recordHolder = record ? profiles.byId.get(record.user_id) : undefined;
  const champion = rows[0]?.rank === 1 && rows.filter((r) => r.rank === 1).length === 1 ? profiles.byId.get(rows[0].user_id) : undefined;

  return (
    <div>
      <PageHeader
        back="/ranking"
        kicker="GAME"
        title={game.name}
        action={
          <Link href={`/games/${id}/bewerken`} className="btn btn-secondary btn-sm" aria-label="Bewerken">
            <Pencil size={16} strokeWidth={3} />
          </Link>
        }
      />
      <Flash sp={sp} />

      <section className="card flex items-center gap-4 p-4">
        <GameIcon icon={game.icon} color={game.color} size="lg" />
        <div className="min-w-0 flex-1">
          {game.description ? (
            <p className="font-bold leading-snug">{game.description}</p>
          ) : (
            <p className="font-bold text-muted">Geen omschrijving</p>
          )}
          <p className="mt-1 text-xs font-bold text-muted">
            {game.min_players}
            {game.max_players ? `–${game.max_players}` : "+"} spelers
            {creator ? ` · toegevoegd door ${creator.username}` : ""}
          </p>
        </div>
      </section>

      {(champion || record) && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {champion && (
            <div className="card bg-yellow p-3">
              <p className="pixel text-[9px]">{season === "all" ? "KAMPIOEN" : `KAMPIOEN ${seasonLabel(season).toUpperCase()}`}</p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={champion.username} color={champion.avatar_color} size="sm" crown />
                <span className="truncate font-black">{champion.username}</span>
              </div>
            </div>
          )}
          {record && recordHolder && (
            <div className="card p-3">
              <p className="pixel text-[9px]">RECORD</p>
              <p className="mt-2 truncate font-black">
                {formatScore(record.total)} <span className="text-sm font-bold text-muted">· {recordHolder.username}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <Trophy size={14} /> Leaderboard
        </span>
      </SectionTitle>
      <SeasonTabs seasons={seasons} active={season} basePath={`/games/${id}`} />
      <div className="mt-2" />
      {rows.length ? (
        <Leaderboard rows={rows} profiles={profiles.byId} meId={me?.user.id} />
      ) : (
        <EmptyState
          icon={<Trophy size={32} />}
          title={season === "all" ? "Nog niet gespeeld" : `Nog niet gespeeld in ${seasonLabel(season)}`}
          text="Na het eerste potje verschijnt hier de ranglijst."
        />
      )}

      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <ScrollText size={14} /> Regels
        </span>
      </SectionTitle>
      <section className="card space-y-3 p-4 text-sm">
        {game.is_team ? (
          <>
            <p>
              <b>Teamspel met geheime rollen.</b> Na afloop tikt de host per speler de rol aan en kiest hij welk team
              won. Iedereen in het winnende team krijgt de punten van dat team.
            </p>
            <div>
              <p className="mb-1.5 font-black">Punten bij winst</p>
              <div className="flex flex-wrap gap-1.5">
                {(game.teams ?? []).map((t) => (
                  <span key={t.name} className="chip bg-purple-soft">
                    {t.name}: {t.points} pt
                  </span>
                ))}
                {game.participation_points > 0 && (
                  <span className="chip bg-green-soft">+{game.participation_points} pt meedoen</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <p>
              <b>{game.scoring_mode === "lowest_wins" ? "Laagste" : "Hoogste"} totaalscore wint.</b> Bij gelijke stand
              bovenaan is er geen winnaar.
            </p>
            <div>
              <p className="mb-1.5 font-black">Ranglijstpunten per plek</p>
              <div className="flex flex-wrap gap-1.5">
                {game.placement_points.map((p, i) => (
                  <span key={i} className={`chip ${i === 0 ? "bg-yellow" : "bg-paper"}`}>
                    {i + 1}e: {p} pt
                  </span>
                ))}
                {game.participation_points > 0 && (
                  <span className="chip bg-green-soft">+{game.participation_points} pt meedoen</span>
                )}
              </div>
            </div>
          </>
        )}
        {game.rules && (
          <div className="border-t-2 border-soft pt-3">
            <p className="mb-1 font-black">Spelregels</p>
            <p className="whitespace-pre-line">{game.rules}</p>
          </div>
        )}
      </section>

      <SectionTitle>
        <span className="inline-flex items-center gap-1.5">
          <History size={14} /> Historie
        </span>
      </SectionTitle>
      {matches.length ? (
        <ul className="card divide-y-2 divide-soft overflow-hidden">
          {matches.map((m) => {
            const w = m.winner_id ? profiles.byId.get(m.winner_id) : undefined;
            return (
              <li key={m.id}>
                <Link href={`/agenda/${m.night_id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                  <span className="w-20 text-xs font-bold text-muted">{m.finished_at ? formatDateShort(m.finished_at) : ""}</span>
                  {!w && !m.is_draw ? (
                    <span className="flex-1 font-black">🏆 {m.winning_team ?? "Teamwinst"}</span>
                  ) : w ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2 font-black">
                      <Avatar name={w.username} color={w.avatar_color} size="xs" />
                      <span className="truncate">{w.username}</span> 🏆
                    </span>
                  ) : (
                    <span className="flex-1 font-bold text-muted">🤝 Gelijkspel</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<History size={32} />} title="Nog geen potjes" />
      )}
    </div>
  );
}
