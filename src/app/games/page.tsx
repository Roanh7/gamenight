import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Gamepad2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGames, getProfiles, getResults } from "@/lib/data";
import { standingsByGame } from "@/lib/stats";
import type { Game } from "@/lib/types";
import { GameIcon } from "@/components/GameIcon";
import { Avatar } from "@/components/Avatar";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Games" };

const TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  solo: { label: "Ieder voor zich", cls: "bg-blue-soft" },
  teams: { label: "Teams", cls: "bg-green-soft" },
  roles: { label: "Geheime rollen", cls: "bg-purple-soft" },
};

function typeOf(g: Game) {
  return g.game_type ?? (g.is_team ? "roles" : "solo");
}

export default async function GamesPage() {
  const supabase = await createClient();
  const [games, results, profiles] = await Promise.all([getGames(supabase), getResults(supabase), getProfiles(supabase)]);

  const played = new Map<string, number>();
  for (const id of new Set(results.map((r) => r.match_id))) {
    const g = results.find((r) => r.match_id === id)!.game_id;
    played.set(g, (played.get(g) ?? 0) + 1);
  }
  const boards = standingsByGame(results);
  const sorted = [...games.list].sort(
    (a, b) => (played.get(b.id) ?? 0) - (played.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  return (
    <div>
      <PageHeader
        kicker="GAMES"
        title="Onze games"
        action={
          <Link href="/games/nieuw" className="btn btn-primary btn-sm">
            <Plus size={16} strokeWidth={3} /> Game
          </Link>
        }
      />

      {sorted.length ? (
        <ul className="grid gap-3">
          {sorted.map((g) => {
            const t = TYPE_LABEL[typeOf(g)];
            const count = played.get(g.id) ?? 0;
            const top = (boards.get(g.id) ?? []).filter((s) => s.rank === 1);
            const champ = top.length === 1 ? profiles.byId.get(top[0].user_id) : undefined;
            return (
              <li key={g.id}>
                <Link href={`/games/${g.id}`} className="card flex items-center gap-3 p-3 transition-transform active:translate-y-[2px]">
                  <GameIcon icon={g.icon} color={g.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{g.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={`chip ${t.cls}`}>{t.label}</span>
                      <span className="text-xs font-bold text-muted">
                        {g.min_players}
                        {g.max_players ? `–${g.max_players}` : "+"} spelers · {count}× gespeeld
                      </span>
                    </div>
                  </div>
                  {champ && (
                    <span className="flex flex-col items-center" title={`Kampioen: ${champ.username}`}>
                      <Avatar name={champ.username} color={champ.avatar_color} size="sm" crown />
                    </span>
                  )}
                  <ChevronRight size={18} className="shrink-0" />
                </Link>
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
