import Link from "next/link";
import type { Game, GameNight, Match, MatchResult, Profile } from "@/lib/types";
import { MatchResults } from "./MatchResults";
import { LiveRefresh } from "./LiveRefresh";

/** Home tijdens een gamenight: de lopende potjes, jouw avond en grote knoppen voor de host. */
export function LiveHub({
  night,
  matches,
  results,
  live,
  liveTeams,
  teams,
  profiles,
  games,
  meId,
  isHost,
}: {
  night: GameNight;
  matches: Match[];
  results: MatchResult[];
  live: Map<string, { user_id: string; total: number; rounds: number }[]>;
  liveTeams: Map<string, { team: string; total: number; members: string[] }[]>;
  teams: Map<string, Map<string, string | null>>;
  profiles: Map<string, Profile>;
  games: Map<string, Game>;
  meId: string;
  isHost: boolean;
}) {
  const liveMatches = matches.filter((m) => m.status === "live");
  const mine = results.filter((r) => r.user_id === meId);
  const points = mine.reduce((t, r) => t + Number(r.league_points), 0);
  const wins = mine.filter((r) => r.is_winner).length;

  return (
    <section className="card mb-4 overflow-hidden">
      {liveMatches.length > 0 && <LiveRefresh />}
      <div className="flex items-center justify-between border-b-2 border-line bg-red px-4 py-2.5 text-white">
        <span className="pixel text-[10px]">
          <span className="blink">●</span> LIVE MODE
        </span>
        <Link href="/live" className="truncate pl-3 text-sm font-black underline">
          {night.title}
        </Link>
      </div>

      <div className="space-y-3 p-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              [points, "Punten"],
              [wins, "Zeges"],
              [mine.length, "Potjes"],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="rounded-xl border-2 border-line bg-cream py-2">
              <p className="pixel text-sm">{v}</p>
              <p className="text-[10px] font-black uppercase text-muted">Jouw {l.toLowerCase()}</p>
            </div>
          ))}
        </div>

        {liveMatches.length ? (
          liveMatches.map((m) => (
            <div key={m.id} className="space-y-2">
              <MatchResults
                match={m}
                game={games.get(m.game_id)}
                results={[]}
                profiles={profiles}
                href={isHost ? `/agenda/${night.id}/host/potje/${m.id}` : undefined}
                live={live.get(m.id)}
                teams={teams.get(m.id)}
                liveTeams={liveTeams.get(m.id)}
              />
              {isHost && (
                <Link href={`/agenda/${night.id}/host/potje/${m.id}`} className="btn btn-primary w-full">
                  ✏️ Scores bijwerken
                </Link>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-cream px-3 py-2 text-sm font-bold">Er loopt nu geen potje.</p>
        )}

        <div className={`grid gap-2 ${isHost ? "grid-cols-2" : "grid-cols-1"}`}>
          {isHost && (
            <Link href={`/agenda/${night.id}/host#potje`} className="btn btn-yellow">
              ▶ Nieuw potje
            </Link>
          )}
          <Link href="/live" className="btn btn-secondary">
            {isHost ? "Live mode" : "Kijk live mee"}
          </Link>
        </div>
      </div>
    </section>
  );
}
