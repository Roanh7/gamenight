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
  live,
}: {
  match: Match;
  game?: Game;
  results: MatchResult[];
  profiles: Map<string, Profile>;
  href?: string;
  live?: { user_id: string; total: number; rounds: number }[];
}) {
  const sorted = [...results].sort((a, b) => a.placement - b.placement);
  const header = (
    <div className="flex items-center gap-3 border-b-2 border-line bg-cream px-3 py-2.5">
      {game && <GameIcon icon={game.icon} color={game.color} size="sm" />}
      <p className="min-w-0 flex-1 truncate font-black">{game?.name ?? "Game"}</p>
      {match.status === "live" ? (
        <span className="chip bg-red text-white">
          <span className="blink">●</span> LIVE
        </span>
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
      ) : live && live.length > 0 ? (
        <LiveStanding live={live} profiles={profiles} lowestWins={game?.scoring_mode === "lowest_wins"} />
      ) : (
        <p className="px-3 py-3 text-sm font-bold text-muted">De host houdt de score bij…</p>
      )}
    </div>
  );
}

function LiveStanding({
  live,
  profiles,
  lowestWins,
}: {
  live: { user_id: string; total: number; rounds: number }[];
  profiles: Map<string, Profile>;
  lowestWins: boolean;
}) {
  const better = (a: number, b: number) => (lowestWins ? a < b : a > b);
  const sorted = [...live].sort((a, b) => (lowestWins ? a.total - b.total : b.total - a.total));
  const place = (t: number) => 1 + live.filter((x) => better(x.total, t)).length;
  const anyScore = live.some((l) => l.total !== 0);
  const leaders = live.filter((l) => place(l.total) === 1);
  const rounds = Math.max(0, ...live.map((l) => l.rounds));
  return (
    <div>
      <ol className="divide-y-2 divide-soft">
        {sorted.map((l) => {
          const p = profiles.get(l.user_id);
          const crown = anyScore && leaders.length === 1 && leaders[0].user_id === l.user_id;
          return (
            <li key={l.user_id} className={`flex items-center gap-3 px-3 py-2 ${crown ? "bg-yellow-soft" : ""}`}>
              <span className="pixel w-5 text-[10px] text-muted">{anyScore ? place(l.total) : "–"}</span>
              <Avatar name={p?.username ?? "?"} color={p?.avatar_color} size="xs" crown={crown} />
              <span className="min-w-0 flex-1 truncate font-bold">{p?.username ?? "Speler"}</span>
              <span className="pixel text-xs">{formatScore(l.total)}</span>
            </li>
          );
        })}
      </ol>
      <p className="border-t-2 border-soft px-3 py-1.5 text-[11px] font-bold text-muted">
        {rounds > 0 ? `Na ronde ${rounds}` : "Nog geen punten"} · ververst automatisch
      </p>
    </div>
  );
}
