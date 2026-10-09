import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check, Clock, Gamepad2, Hourglass, MapPin, Plus, Shield } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getNight, getProfiles, tallyVotes } from "@/lib/data";
import { formatDateLong, formatTime } from "@/lib/format";
import { castVote, joinNight, leaveNight } from "../actions";
import { Avatar } from "@/components/Avatar";
import { GameIcon } from "@/components/GameIcon";
import { MatchResults } from "@/components/MatchResults";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { NightActions } from "@/components/NightActions";
import { LiveRefresh } from "@/components/LiveRefresh";
import { EmptyState, PageHeader, SectionTitle, StatusChip } from "@/components/ui";

export const metadata: Metadata = { title: "Gamenight" };

export default async function NightPage(props: PageProps<"/agenda/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [data, profiles, games] = await Promise.all([
    getNight(supabase, id),
    getProfiles(supabase),
    getGames(supabase),
  ]);
  if (!data || !me) notFound();
  const { night, participants, votes, matches, results, live, liveTeams, teams } = data;
  const hasLive = matches.some((m) => m.status === "live");

  const host = profiles.byId.get(night.host_id);
  const isHost = night.host_id === me.user.id;
  const mine = participants.find((p) => p.user_id === me.user.id);
  const myVotes = new Set(votes.filter((v) => v.user_id === me.user.id).map((v) => v.game_id));
  const tally = tallyVotes(votes);
  const isFixed = night.vote_mode === "fixed";
  const canVote = night.status === "planned" && !isFixed;
  const playedIds = new Set(matches.filter((m) => m.status === "finished").map((m) => m.game_id));
  const liveIds = new Set(matches.filter((m) => m.status === "live").map((m) => m.game_id));
  const program = (night.game_ids ?? []).map((g) => games.byId.get(g)).filter(Boolean) as typeof games.list;
  const canJoin = night.status === "planned" || night.status === "live";
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const pending = participants.filter((p) => p.status === "pending");

  const sortedGames = [...games.list].sort(
    (a, b) => (tally.counts.get(b.id) ?? 0) - (tally.counts.get(a.id) ?? 0) || a.name.localeCompare(b.name),
  );

  const matchesSection = matches.length > 0 && (
        <>
          {hasLive && <LiveRefresh />}
          <SectionTitle>{hasLive ? "Nu live" : "Potjes van vanavond"}</SectionTitle>
          <div className="grid gap-3">
            {matches.map((m) => (
              <MatchResults
                key={m.id}
                match={m}
                game={games.byId.get(m.game_id)}
                results={results.filter((r) => r.match_id === m.id)}
                profiles={profiles.byId}
                href={isHost ? `/agenda/${night.id}/host/potje/${m.id}` : undefined}
                live={live.get(m.id)}
                teams={teams.get(m.id)}
                liveTeams={liveTeams.get(m.id)}
              />
            ))}
          </div>
        </>
  );

  return (
    <div>
      <PageHeader back="/agenda" kicker="GAMENIGHT" title={night.title} />
      <Flash sp={sp} />

      {/* Info */}
      <section className="card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 text-sm font-bold">
            <p className="flex items-center gap-2">
              <Clock size={15} /> {formatDateLong(night.starts_at)} · {formatTime(night.starts_at)}
            </p>
            {night.location && (
              <p className="flex items-center gap-2">
                <MapPin size={15} /> {night.location}
              </p>
            )}
            {host && (
              <p className="flex items-center gap-2">
                <Shield size={15} /> Host: {host.username}
              </p>
            )}
          </div>
          <StatusChip status={night.status} />
        </div>
        {night.notes && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-cream px-3 py-2 text-sm">{night.notes}</p>
        )}
        {(night.status === "planned" || night.status === "live") && (
          <NightActions
            nightId={night.id}
            shareText={[
              `🎮 ${night.title}`,
              `📅 ${formatDateLong(night.starts_at)} om ${formatTime(night.starts_at)}`,
              night.location ? `📍 ${night.location}` : null,
              host ? `🛡️ Host: ${host.username}` : null,
            ]
              .filter(Boolean)
              .join("\n")}
          />
        )}
        {isHost && (
          <Link href={`/agenda/${night.id}/host`} className="btn btn-yellow mt-4 w-full">
            🎮 Host dashboard
          </Link>
        )}
      </section>

      {hasLive && matchesSection}

      {/* Deelnemers */}
      <SectionTitle>Wie komen er? ({participants.length})</SectionTitle>
      <section className="card p-4">
        <ul className="flex flex-wrap gap-2">
          {confirmed.map((p) => {
            const pr = profiles.byId.get(p.user_id);
            return pr ? (
              <li key={p.user_id} className="chip bg-green-soft py-1 pl-1 text-sm">
                <Avatar name={pr.username} color={pr.avatar_color} size="xs" />
                {pr.username}
                <Check size={13} strokeWidth={3} />
              </li>
            ) : null;
          })}
          {pending.map((p) => {
            const pr = profiles.byId.get(p.user_id);
            return pr ? (
              <li key={p.user_id} className="chip bg-paper py-1 pl-1 text-sm text-muted">
                <Avatar name={pr.username} color={pr.avatar_color} size="xs" />
                {pr.username}
                <Hourglass size={13} strokeWidth={3} />
              </li>
            ) : null;
          })}
        </ul>
        {pending.length > 0 && (
          <p className="mt-2 text-xs text-muted">⏳ = wacht op bevestiging van de host</p>
        )}
        {canJoin && (
          <form action={mine ? leaveNight : joinNight} className="mt-4">
            <input type="hidden" name="night_id" value={night.id} />
            {mine ? (
              isHost ? null : (
                <SubmitButton className="btn btn-secondary btn-sm w-full" confirm="Weet je zeker dat je je afmeldt?">
                  Afmelden
                </SubmitButton>
              )
            ) : (
              <SubmitButton className="btn btn-green w-full" pendingText="Aanmelden…">
                ✋ Ik doe mee!
              </SubmitButton>
            )}
          </form>
        )}
      </section>

      {/* Games van de avond */}
      {isFixed ? (
        <>
          <SectionTitle>Programma van de avond</SectionTitle>
          <ol className="card divide-y-2 divide-soft overflow-hidden">
            {program.map((g, i) => (
              <li key={g.id} className={`flex items-center gap-3 px-4 py-3 ${playedIds.has(g.id) ? "bg-cream" : ""}`}>
                <span className="pixel w-5 text-[11px] text-muted">{i + 1}</span>
                <GameIcon icon={g.icon} color={g.color} size="sm" />
                <Link href={`/games/${g.id}`} className="min-w-0 flex-1 truncate font-black">
                  {g.name}
                </Link>
                {liveIds.has(g.id) ? (
                  <span className="chip bg-red text-white">● Live</span>
                ) : playedIds.has(g.id) ? (
                  <span className="chip bg-green-soft">✓ Gespeeld</span>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-1.5 text-xs text-muted">De host heeft deze games gekozen. Er wordt niet gestemd.</p>
        </>
      ) : (
        <>
          <SectionTitle>{canVote ? "Op welke games heb je zin?" : "Uitslag stemming"}</SectionTitle>
          {games.list.length === 0 ? (
            <EmptyState
              icon={<Gamepad2 size={32} />}
              title="Nog geen games"
              text="Voeg eerst games toe, dan kan er gestemd worden."
              action={
                <Link href="/games/nieuw" className="btn btn-primary btn-sm">
                  <Plus size={16} strokeWidth={3} /> Game toevoegen
                </Link>
              }
            />
          ) : (
            <section className="card overflow-hidden">
              <p className="border-b-2 border-line bg-cream px-4 py-2 text-xs font-bold text-muted">
                {tally.voters
                  ? `${tally.voters} ${tally.voters === 1 ? "persoon heeft" : "mensen hebben"} gestemd`
                  : "Nog niemand gestemd"}
                {canVote && " · stem op zoveel games als je wilt, tik nog eens om je stem in te trekken"}
              </p>
              <ul className="divide-y-2 divide-soft">
                {sortedGames.map((g) => {
                  const count = tally.counts.get(g.id) ?? 0;
                  const pct = tally.voters ? Math.round((count / tally.voters) * 100) : 0;
                  const voters = votes.filter((v) => v.game_id === g.id);
                  const isMine = myVotes.has(g.id);
                  const leading = tally.leaders.includes(g.id);
                  const inner = (
                    <div className="relative flex items-center gap-3 px-4 py-3">
                      <div
                        className={`absolute inset-y-0 left-0 ${leading ? "bg-yellow-soft" : "bg-soft/60"}`}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                      <span
                        className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-line text-xs font-black ${isMine ? "bg-red text-white" : "bg-paper"}`}
                        aria-hidden
                      >
                        {isMine ? "✓" : ""}
                      </span>
                      <span className="relative">
                        <GameIcon icon={g.icon} color={g.color} size="sm" />
                      </span>
                      <div className="relative min-w-0 flex-1 text-left">
                        <p className="truncate font-black">
                          {g.name} {leading && count > 0 && <span className="text-xs">👑</span>}
                        </p>
                        <div className="mt-0.5 flex -space-x-1">
                          {voters.map((v) => {
                            const pr = profiles.byId.get(v.user_id);
                            return pr ? <Avatar key={v.user_id} name={pr.username} color={pr.avatar_color} size="xs" /> : null;
                          })}
                        </div>
                      </div>
                      {liveIds.has(g.id) ? (
                        <span className="chip relative bg-red text-white">● Live</span>
                      ) : playedIds.has(g.id) ? (
                        <span className="chip relative bg-green-soft">✓</span>
                      ) : null}
                      <span className="pixel relative text-xs">{count}</span>
                    </div>
                  );
                  return (
                    <li key={g.id}>
                      {canVote ? (
                        <form action={castVote}>
                          <input type="hidden" name="night_id" value={night.id} />
                          <input type="hidden" name="game_id" value={g.id} />
                          <input type="hidden" name="voted" value={isMine ? "1" : ""} />
                          <button
                            type="submit"
                            aria-pressed={isMine}
                            className="block w-full transition-colors hover:bg-cream"
                          >
                            {inner}
                          </button>
                        </form>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}

      {!hasLive && matchesSection}
    </div>
  );
}
