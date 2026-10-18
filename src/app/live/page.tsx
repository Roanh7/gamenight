import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getNight, getProfiles, getResults } from "@/lib/data";
import { computeWanted, wantedNow } from "@/lib/wanted";
import { WantedStrip } from "@/components/WantedPoster";
import { getMyActiveNight } from "@/lib/live";
import { MatchResults } from "@/components/MatchResults";
import { LiveRefresh } from "@/components/LiveRefresh";
import { GameIcon } from "@/components/GameIcon";
import { Avatar } from "@/components/Avatar";
import { EmptyState, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Live" };

const ROLE = {
  host: { label: "👑 Jij bent de host", text: "Jij start potjes en houdt de scores bij." },
  cohost: { label: "🎙️ Jij bent co-host", text: "Jij mag potjes starten en scores bijhouden." },
  player: { label: "👀 Je kijkt mee", text: "De host houdt de scores bij. Jij ziet alles live." },
} as const;

/** Live Game Mode: alles van de avond die nu bezig is op één scherm. */
export default async function LivePage() {
  const me = await getMe();
  if (!me) redirect("/login");
  const active = await getMyActiveNight();
  if (!active) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-black">Live</h1>
        <EmptyState
          icon={<span className="text-3xl">🎮</span>}
          title="Er is nu geen avond bezig"
          text="Zodra een gamenight begint waar jij bij bent, zie je hier alles live."
          action={
            <Link href="/agenda" className="btn btn-primary btn-sm">
              Naar de agenda
            </Link>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [data, profiles, games, allResults] = await Promise.all([
    getNight(supabase, active.id),
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
  ]);
  if (!data) redirect("/agenda");
  const { night, matches, results } = data;
  const isHost = active.role !== "player";
  const liveMatches = matches.filter((m) => m.status === "live");
  const finished = matches.filter((m) => m.status === "finished").reverse();
  const role = ROLE[active.role];
  const here = new Set([night.host_id, ...data.participants.filter((p) => p.status === "confirmed").map((p) => p.user_id)]);
  const wantedHere = night.wanted_off
    ? []
    : wantedNow(computeWanted(allResults))
        .filter((w) => here.has(w.user_id))
        .map((w) => ({ ...w, profile: profiles.byId.get(w.user_id)! }))
        .filter((w) => w.profile);

  // Stand van vanavond (punten uit afgeronde potjes)
  const tonight = new Map<string, { points: number; wins: number; played: number }>();
  for (const r of results) {
    const e = tonight.get(r.user_id) ?? { points: 0, wins: 0, played: 0 };
    e.points += Number(r.league_points);
    e.played++;
    if (r.is_winner) e.wins++;
    tonight.set(r.user_id, e);
  }
  const table = [...tonight.entries()].sort((a, b) => b[1].points - a[1].points || b[1].wins - a[1].wins);

  return (
    <div>
      {liveMatches.length > 0 && <LiveRefresh />}

      <section className="card mb-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-red px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="pixel text-[10px]">
              <span className="blink">●</span> LIVE GAME MODE
            </p>
            <h1 className="mt-1 truncate text-xl font-black">{night.title}</h1>
          </div>
          <Link href={`/agenda/${night.id}`} className="btn btn-secondary btn-sm shrink-0 text-ink">
            Avond
          </Link>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className={`chip ${isHost ? "bg-yellow" : "bg-blue-soft"}`}>{role.label}</span>
          <span className="text-xs font-bold text-muted">{role.text}</span>
        </div>
      </section>

      {wantedHere.length > 0 && (
        <section className="mb-4">
          <p className="pixel mb-2 text-[10px] text-red">🎯 WANTED VANAVOND</p>
          <WantedStrip items={wantedHere} />
        </section>
      )}
      {night.wanted_off && (
        <p className="mb-4 rounded-xl border-2 border-line bg-soft px-3 py-2 text-xs font-bold">
          🤠 Wanted staat uit vanavond: deze potjes tellen niet mee voor winstreeksen en premies.
        </p>
      )}

      {isHost && (
        <Link href={`/agenda/${night.id}/host#potje`} className="btn btn-yellow mb-4 w-full py-4 text-lg">
          ▶ Nieuw potje starten
        </Link>
      )}

      <SectionTitle>Nu bezig ({liveMatches.length})</SectionTitle>
      {liveMatches.length ? (
        <div className="space-y-3">
          {liveMatches.map((m) => (
            <div key={m.id} className="space-y-2">
              <MatchResults
                match={m}
                game={games.byId.get(m.game_id)}
                results={[]}
                profiles={profiles.byId}
                href={isHost ? `/agenda/${night.id}/host/potje/${m.id}` : undefined}
                live={data.live.get(m.id)}
                teams={data.teams.get(m.id)}
                liveTeams={data.liveTeams.get(m.id)}
              />
              {isHost && (
                <Link href={`/agenda/${night.id}/host/potje/${m.id}`} className="btn btn-primary w-full py-4 text-lg">
                  ✏️ Scores invoeren
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="card px-4 py-3 text-sm font-bold">
          {isHost ? "Er loopt geen potje. Start er hierboven een." : "Er loopt nu geen potje. Even wachten op de host."}
        </p>
      )}

      {table.length > 0 && (
        <>
          <SectionTitle>Stand vanavond</SectionTitle>
          <ol className="card divide-y-2 divide-soft overflow-hidden">
            {table.map(([uid, e], i) => {
              const p = profiles.byId.get(uid);
              if (!p) return null;
              return (
                <li key={uid} className={`flex items-center gap-3 px-3 py-2.5 ${uid === me.user.id ? "bg-yellow-soft" : ""}`}>
                  <span className="pixel w-5 text-[11px] text-muted">{i + 1}</span>
                  <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" crown={i === 0} />
                  <span className="min-w-0 flex-1 truncate font-black">{p.username}</span>
                  <span className="text-xs font-bold text-muted">{e.wins}× gewonnen</span>
                  <span className="pixel text-sm">{e.points}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <SectionTitle>Afgerond ({finished.length})</SectionTitle>
      {finished.length ? (
        <ul className="card divide-y-2 divide-soft overflow-hidden">
          {finished.map((m) => {
            const g = games.byId.get(m.game_id);
            const w = m.winner_id ? profiles.byId.get(m.winner_id) : undefined;
            return (
              <li key={m.id}>
                <Link
                  href={isHost ? `/agenda/${night.id}/host/potje/${m.id}` : `/agenda/${night.id}`}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-cream"
                >
                  {g && <GameIcon icon={g.icon} color={g.color} size="sm" />}
                  <span className="min-w-0 flex-1 truncate font-black">{g?.name ?? "Game"}</span>
                  <span className="truncate text-sm font-bold">
                    {m.is_draw ? "🤝 Gelijk" : w ? `🏆 ${w.username}` : `🏆 ${m.winning_team ?? "Team"}`}
                  </span>
                  <ChevronRight size={18} className="shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="card px-4 py-3 text-sm font-bold text-muted">Nog geen potjes afgerond.</p>
      )}

      <p className="mt-6 text-center text-xs font-bold text-muted">
        Liever het gewone menu? Tik onderaan op <b>Menu</b>. Met <b>Terug naar live</b> kom je weer hier.
      </p>
    </div>
  );
}
