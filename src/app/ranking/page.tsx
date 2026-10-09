import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Gamepad2, Plus } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getProfiles, getResults } from "@/lib/data";
import {
  currentSeason,
  daysLeftInSeason,
  filterSeason,
  seasonChampions,
  seasonLabel,
  seasonMonths,
  seasonsWithData,
  standings,
  standingsByGame,
} from "@/lib/stats";
import { GameIcon } from "@/components/GameIcon";
import { Leaderboard } from "@/components/Leaderboard";
import { Avatar } from "@/components/Avatar";
import { SeasonTabs, parseSeason } from "@/components/SeasonTabs";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage(props: PageProps<"/ranking">) {
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [games, results, profiles] = await Promise.all([
    getGames(supabase),
    getResults(supabase),
    getProfiles(supabase),
  ]);

  const seasons = seasonsWithData(results);
  const season = parseSeason(sp.seizoen, seasons);
  const rows = filterSeason(results, season);
  const overall = standings(rows);
  const boards = standingsByGame(rows);
  const champions = seasonChampions(results);
  const isCurrent = season === currentSeason();
  const champ = season !== "all" ? champions.get(season) : undefined;
  const champProfile = champ ? profiles.byId.get(champ) : undefined;

  // Meest gespeelde games eerst
  const playedCount = new Map<string, number>();
  for (const r of rows) playedCount.set(r.game_id, (playedCount.get(r.game_id) ?? 0) + 1);
  const sortedGames = [...games.list].sort(
    (a, b) => (playedCount.get(b.id) ?? 0) - (playedCount.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  return (
    <div>
      <PageHeader
        kicker="RANKING"
        title="Hall of Fame"
        action={
          <Link href="/games/nieuw" className="btn btn-primary btn-sm">
            <Plus size={16} strokeWidth={3} /> Game
          </Link>
        }
      />

      <SeasonTabs seasons={seasons} active={season} basePath="/ranking" />

      {/* Seizoensbanner */}
      {season !== "all" && (
        <section className={`card mt-3 p-4 ${isCurrent ? "bg-blue text-white" : "bg-yellow"}`}>
          <p className="pixel text-[9px] opacity-90">SEIZOEN {seasonLabel(season).toUpperCase()}</p>
          {isCurrent ? (
            <>
              <p className="mt-1 text-lg font-black">Nog {daysLeftInSeason(season)} dagen te gaan</p>
              <p className="text-sm font-bold opacity-90">
                {seasonMonths(season)} · de nummer 1 wordt Seizoenskampioen 🏆
              </p>
            </>
          ) : champProfile ? (
            <div className="mt-2 flex items-center gap-3">
              <Avatar name={champProfile.username} color={champProfile.avatar_color} size="md" crown />
              <div>
                <p className="text-lg font-black leading-tight">{champProfile.username}</p>
                <p className="text-sm font-bold">Seizoenskampioen {seasonLabel(season)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-1 font-black">Gedeelde eerste plek: geen kampioen dit seizoen 🤝</p>
          )}
        </section>
      )}

      <SectionTitle>{season === "all" ? "Algemeen klassement" : "Klassement"}</SectionTitle>
      {overall.length ? (
        <Leaderboard
          rows={overall.map((o) => ({ ...o, extra: `${o.games_played} ${o.games_played === 1 ? "game" : "games"}` }))}
          profiles={profiles.byId}
          meId={me?.user.id}
        />
      ) : (
        <EmptyState
          icon={<span className="text-3xl">🏆</span>}
          title={isCurrent ? "Nieuw seizoen, schone lei" : "Nog leeg"}
          text="Na het eerste afgeronde potje staat hier de stand."
        />
      )}

      <SectionTitle>Per game</SectionTitle>
      {sortedGames.length ? (
        <ul className="grid grid-cols-1 gap-3 [&>li]:min-w-0">
          {sortedGames.map((g) => {
            const gRows = boards.get(g.id) ?? [];
            const href = season === currentSeason() ? `/games/${g.id}` : `/games/${g.id}?seizoen=${season}`;
            return (
              <li key={g.id} className="card overflow-hidden">
                <Link href={href} className="flex items-center gap-3 border-b-2 border-line bg-cream px-3 py-2.5">
                  <GameIcon icon={g.icon} color={g.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{g.name}</p>
                    <p className="text-xs font-bold text-muted">
                      {gRows.length ? `${gRows.length} spelers op de ranglijst` : "Nog niet gespeeld"}
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </Link>
                {gRows.length > 0 ? (
                  <div className="p-2">
                    <Leaderboard rows={gRows} profiles={profiles.byId} meId={me?.user.id} limit={3} compact />
                  </div>
                ) : (
                  <p className="px-3 py-3 text-sm text-muted">Wie pakt de eerste kroon? 👑</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={<Gamepad2 size={32} />}
          title="Nog geen games"
          text="Voeg de games toe die jullie spelen, met eigen scoreregels."
          action={
            <Link href="/games/nieuw" className="btn btn-primary btn-sm">
              <Plus size={16} strokeWidth={3} /> Game toevoegen
            </Link>
          }
        />
      )}
    </div>
  );
}
