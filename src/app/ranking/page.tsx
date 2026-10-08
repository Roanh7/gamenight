import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Gamepad2, Plus } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getLeaderboards, getOverall, getProfiles } from "@/lib/data";
import { GameIcon } from "@/components/GameIcon";
import { Leaderboard } from "@/components/Leaderboard";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Ranking" };

export default async function RankingPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [games, boards, overall, profiles] = await Promise.all([
    getGames(supabase),
    getLeaderboards(supabase),
    getOverall(supabase),
    getProfiles(supabase),
  ]);

  // Meest gespeelde games eerst
  const playedCount = new Map<string, number>();
  for (const b of boards) playedCount.set(b.game_id, (playedCount.get(b.game_id) ?? 0) + b.played);
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

      <SectionTitle>Algemeen klassement</SectionTitle>
      {overall.length ? (
        <Leaderboard
          rows={overall.map((o) => ({ ...o, extra: `${o.games_played} ${o.games_played === 1 ? "game" : "games"}` }))}
          profiles={profiles.byId}
          meId={me?.user.id}
        />
      ) : (
        <EmptyState icon={<span className="text-3xl">🏆</span>} title="Nog leeg" text="Na het eerste afgeronde potje staat hier de stand." />
      )}

      <SectionTitle>Per game</SectionTitle>
      {sortedGames.length ? (
        <ul className="grid gap-3">
          {sortedGames.map((g) => {
            const rows = boards.filter((b) => b.game_id === g.id);
            return (
              <li key={g.id} className="card overflow-hidden">
                <Link href={`/games/${g.id}`} className="flex items-center gap-3 border-b-2 border-line bg-cream px-3 py-2.5">
                  <GameIcon icon={g.icon} color={g.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{g.name}</p>
                    <p className="text-xs font-bold text-muted">
                      {playedCount.get(g.id) ? `${rows.length} spelers op de ranglijst` : "Nog niet gespeeld"}
                    </p>
                  </div>
                  <ChevronRight size={18} />
                </Link>
                {rows.length > 0 ? (
                  <div className="p-2">
                    <Leaderboard rows={rows} profiles={profiles.byId} meId={me?.user.id} limit={3} compact />
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
