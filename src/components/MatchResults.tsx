import Link from "next/link";
import type { Game, Match, MatchResult, Profile } from "@/lib/types";
import { formatScore } from "@/lib/format";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { RankBadge } from "./ui";

export function MatchResults({
  match,
  game,
  results,
  profiles,
  href,
}: {
  match: Match;
  game?: Game;
  results: MatchResult[];
  profiles: Map<string, Profile>;
  href?: string;
}) {
  const sorted = [...results].sort((a, b) => a.placement - b.placement);
  const header = (
    <div className="flex items-center gap-3 border-b-2 border-line bg-cream px-3 py-2.5">
      {game && <GameIcon icon={game.icon} color={game.color} size="sm" />}
      <p className="min-w-0 flex-1 truncate font-black">{game?.name ?? "Game"}</p>
      {match.status === "live" ? (
        <span className="chip bg-red text-white">● Bezig</span>
      ) : match.is_draw ? (
        <span className="chip bg-soft">🤝 Gelijkspel</span>
      ) : (
        <span className="chip bg-yellow">🏆 Winnaar</span>
      )}
    </div>
  );
  return (
    <div className="card overflow-hidden">
      {href ? <Link href={href}>{header}</Link> : header}
      {match.status === "finished" ? (
        <ol className="divide-y-2 divide-soft">
          {sorted.map((r) => {
            const p = profiles.get(r.user_id);
            return (
              <li key={r.user_id} className={`flex items-center gap-3 px-3 py-2 ${r.is_winner ? "bg-yellow-soft" : ""}`}>
                <RankBadge rank={r.placement} />
                <Avatar name={p?.username ?? "?"} color={p?.avatar_color} size="xs" crown={r.is_winner} />
                <span className="min-w-0 flex-1 truncate font-bold">{p?.username ?? "Speler"}</span>
                <span className="text-sm font-black">{formatScore(r.total)}</span>
                <span className="w-12 text-right text-xs font-black text-green">+{r.league_points} pt</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-3 py-3 text-sm font-bold text-muted">De host houdt de score bij…</p>
      )}
    </div>
  );
}
