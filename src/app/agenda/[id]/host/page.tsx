import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Check, ChevronRight, Flag, Play, UserPlus, X } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getNight, getProfiles, nightGameOrder, tallyVotes } from "@/lib/data";
import {
  addParticipant,
  confirmAll,
  confirmParticipant,
  removeParticipant,
  setCohost,
  setNightStatus,
  startMatch,
  addGameToNight,
} from "../../actions";
import { Avatar } from "@/components/Avatar";
import { GameIcon } from "@/components/GameIcon";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { PageHeader, SectionTitle, StatusChip } from "@/components/ui";

export const metadata: Metadata = { title: "Host dashboard" };

export default async function HostPage(props: PageProps<"/agenda/[id]/host">) {
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
  const { night, participants, votes, matches } = data;
  if (night.host_id !== me.user.id && night.cohost_id !== me.user.id) {
    redirect(`/agenda/${id}?fout=${encodeURIComponent("Alleen de host kan het host dashboard openen.")}`);
  }

  const tally = tallyVotes(votes);
  const pending = participants.filter((p) => p.status === "pending");
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const notJoined = profiles.list.filter((p) => !participants.some((x) => x.user_id === p.id));
  // De games van vanavond: nog niet gespeeld eerst. De host kiest zelf welke nu.
  const order = nightGameOrder(night, votes).filter((g) => games.byId.has(g));
  const playedIds = new Set(matches.filter((m) => m.status === "finished").map((m) => m.game_id));
  const liveIds = new Set(matches.filter((m) => m.status === "live").map((m) => m.game_id));
  const tonight = [...order.filter((g) => !playedIds.has(g)), ...order.filter((g) => playedIds.has(g))].map(
    (g) => games.byId.get(g)!,
  );
  const picked = typeof sp.game === "string" && order.includes(sp.game) ? sp.game : undefined;
  const defaultGame = picked ?? tonight[0]?.id;
  const notTonight = games.list.filter((g) => !order.includes(g.id));

  return (
    <div>
      <PageHeader back={`/agenda/${id}`} kicker="HOST DASHBOARD" title={night.title} action={<StatusChip status={night.status} />} />
      <Flash sp={sp} />

      {/* Status */}
      <section className="card p-4">
        <p className="mb-3 text-sm font-bold text-muted">
          {night.status === "planned" && "De avond staat gepland. Start hem als jullie gaan spelen; stemmen sluit dan."}
          {night.status === "live" && "De avond is bezig. Start potjes en houd de scores bij."}
          {night.status === "finished" && "Deze avond is afgelopen. GG!"}
          {night.status === "cancelled" && "Deze avond is afgelast."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {night.status === "planned" && (
            <StatusButton id={id} status="live" className="btn btn-primary col-span-2">
              <Play size={18} strokeWidth={3} /> Start de avond
            </StatusButton>
          )}
          {night.status === "live" && (
            <StatusButton id={id} status="finished" className="btn btn-green col-span-2" confirm="Avond afsluiten?">
              <Flag size={18} strokeWidth={3} /> Avond afsluiten
            </StatusButton>
          )}
          {(night.status === "finished" || night.status === "cancelled" || night.status === "live") && (
            <StatusButton id={id} status="planned" className="btn btn-secondary btn-sm">
              Terug naar gepland
            </StatusButton>
          )}
          {night.status === "planned" && (
            <StatusButton id={id} status="cancelled" className="btn btn-secondary btn-sm col-span-2" confirm="Avond afgelasten?">
              Afgelasten
            </StatusButton>
          )}
        </div>
      </section>

      {/* Nieuw potje */}
      {(night.status === "live" || night.status === "planned") && (
        <>
          <div id="potje" className="scroll-mt-20" />
          <SectionTitle>Nieuw potje starten</SectionTitle>
          {games.list.length === 0 ? (
            <p className="card p-4 text-sm font-bold">
              Er zijn nog geen games.{" "}
              <Link href={`/games/nieuw?avond=${id}`} className="text-red underline">
                Voeg er een toe
              </Link>
              .
            </p>
          ) : (
            <form action={startMatch} className="card space-y-4 p-4">
              <input type="hidden" name="night_id" value={id} />
              <fieldset>
                <legend className="label">Welke game spelen we nu?</legend>
                {tonight.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {tonight.map((g) => (
                      <label
                        key={g.id}
                        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-paper px-2 py-2 has-[:checked]:bg-yellow has-[:checked]:shadow-[0_3px_0_var(--color-line)]"
                      >
                        <input type="radio" name="game_id" value={g.id} defaultChecked={g.id === defaultGame} required className="sr-only" />
                        <GameIcon icon={g.icon} color={g.color} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">{g.name}</span>
                          <span className="block text-[11px] font-bold text-muted">
                            {liveIds.has(g.id)
                              ? "● nu live"
                              : playedIds.has(g.id)
                                ? "✓ al gespeeld"
                                : night.vote_mode === "vote" && tally.counts.get(g.id)
                                  ? `${tally.counts.get(g.id)} stem(men)`
                                  : "nog niet gespeeld"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-cream px-3 py-2 text-sm font-bold">
                    Er zijn nog geen games voor vanavond. Zet er hieronder een bij.
                  </p>
                )}
                <p className="mt-1.5 text-xs font-bold text-muted">Tik de game aan die jullie nu gaan spelen. De volgorde maakt niet uit.</p>
              </fieldset>
              <fieldset>
                <legend className="label">Spelers</legend>
                <div className="grid grid-cols-2 gap-2">
                  {confirmed.map((p) => {
                    const pr = profiles.byId.get(p.user_id);
                    if (!pr) return null;
                    return (
                      <label
                        key={p.user_id}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-paper px-2 py-2 has-[:checked]:bg-green-soft"
                      >
                        <input type="checkbox" name="players" value={p.user_id} defaultChecked className="h-4 w-4 accent-[#22a04b]" />
                        <Avatar name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} size="xs" />
                        <span className="truncate text-sm font-bold">{pr.username}</span>
                      </label>
                    );
                  })}
                </div>
                {confirmed.length < 2 && (
                  <p className="mt-2 text-xs font-bold text-red">Bevestig eerst minimaal 2 deelnemers hieronder.</p>
                )}
              </fieldset>
              <SubmitButton className="btn btn-primary w-full" pendingText="Starten…" disabled={!tonight.length}>
                <Play size={18} strokeWidth={3} /> Start potje & tel scores
              </SubmitButton>
            </form>
          )}
          <section className="card mt-3 p-4">
            <p className="label">➕ Nog een game erbij voor vanavond</p>
            {notTonight.length > 0 && (
              <form action={addGameToNight} className="flex items-center gap-2">
                <input type="hidden" name="night_id" value={id} />
                <select name="game_id" aria-label="Game kiezen" className="input min-w-0 flex-1">
                  {notTonight.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn btn-secondary shrink-0" pendingText="…">
                  Voeg toe
                </SubmitButton>
              </form>
            )}
            <Link href={`/games/nieuw?avond=${id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-black text-red underline">
              Staat de game er niet tussen? Maak hem nu aan
            </Link>
            <p className="mt-1 text-xs text-muted">Er hoeft niks opnieuw: de game komt er gewoon bij.</p>
          </section>
        </>
      )}

      {/* Potjes */}
      {matches.length > 0 && (
        <>
          <SectionTitle>Potjes ({matches.length})</SectionTitle>
          <ul className="card divide-y-2 divide-soft overflow-hidden">
            {matches.map((m, i) => {
              const g = games.byId.get(m.game_id);
              const w = m.winner_id ? profiles.byId.get(m.winner_id) : undefined;
              return (
                <li key={m.id}>
                  <Link href={`/agenda/${id}/host/potje/${m.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-cream">
                    {g && <GameIcon icon={g.icon} color={g.color} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">
                        <span className="pixel mr-1 text-[9px] text-muted">#{i + 1}</span> {g?.name}
                      </p>
                      <p className="text-xs font-bold text-muted">
                        {m.status === "live"
                          ? "Bezig: scores invoeren"
                          : m.is_draw
                            ? "Gelijkspel"
                            : w
                              ? `Gewonnen door ${w.username}`
                              : `${m.winning_team ?? "Team"} wint`}
                      </p>
                    </div>
                    {m.status === "live" ? <span className="chip bg-red text-white">● Live</span> : <span>🏆</span>}
                    <ChevronRight size={18} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Deelnemers */}
      <SectionTitle
        action={
          pending.length > 1 ? (
            <form action={confirmAll}>
              <input type="hidden" name="night_id" value={id} />
              <SubmitButton className="btn btn-green btn-sm">Alles bevestigen</SubmitButton>
            </form>
          ) : undefined
        }
      >
        Deelnemers
      </SectionTitle>
      <section className="card divide-y-2 divide-soft overflow-hidden">
        {[...pending, ...confirmed].map((p) => {
          const pr = profiles.byId.get(p.user_id);
          if (!pr) return null;
          return (
            <div key={p.user_id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{pr.username}</p>
                <p className="text-xs font-bold text-muted">
                  {p.status === "confirmed" ? "Bevestigd" : "Wacht op bevestiging"}
                  {p.user_id === night.host_id ? " · host" : ""}
                  {p.user_id === night.cohost_id ? " · co-host" : ""}
                </p>
              </div>
              {p.status === "confirmed" && p.user_id !== night.host_id && (
                <form action={setCohost}>
                  <input type="hidden" name="night_id" value={id} />
                  <input type="hidden" name="user_id" value={p.user_id === night.cohost_id ? "" : p.user_id} />
                  <SubmitButton
                    className={`btn btn-sm px-2 ${p.user_id === night.cohost_id ? "btn-yellow" : "btn-secondary"}`}
                    pendingText="…"
                  >
                    <span className="text-xs">{p.user_id === night.cohost_id ? "Co-host ✓" : "Co-host"}</span>
                  </SubmitButton>
                </form>
              )}
              {p.status === "pending" && (
                <form action={confirmParticipant}>
                  <input type="hidden" name="night_id" value={id} />
                  <input type="hidden" name="user_id" value={p.user_id} />
                  <SubmitButton className="btn btn-green btn-sm" pendingText="…">
                    <Check size={16} strokeWidth={3} /> Bevestig
                  </SubmitButton>
                </form>
              )}
              {p.user_id !== night.host_id && p.user_id !== night.cohost_id && (
                <form action={removeParticipant}>
                  <input type="hidden" name="night_id" value={id} />
                  <input type="hidden" name="user_id" value={p.user_id} />
                  <SubmitButton
                    className="btn btn-secondary btn-sm px-2"
                    pendingText="…"
                    confirm={`${pr.username} verwijderen van deze avond?`}
                  >
                    <X size={16} strokeWidth={3} />
                    <span className="sr-only">Verwijderen</span>
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })}
        {notJoined.length > 0 && (
          <form action={addParticipant} className="flex gap-2 bg-cream p-3">
            <input type="hidden" name="night_id" value={id} />
            <select name="user_id" className="input min-h-[40px] flex-1 py-1.5 text-sm" defaultValue="">
              <option value="" disabled>
                Iemand toevoegen…
              </option>
              {notJoined.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.username}
                </option>
              ))}
            </select>
            <SubmitButton className="btn btn-blue btn-sm" pendingText="…">
              <UserPlus size={16} strokeWidth={3} />
              <span className="sr-only">Toevoegen</span>
            </SubmitButton>
          </form>
        )}
      </section>

      {/* Avond bewerken */}
      <SectionTitle>Avond bewerken</SectionTitle>
      <Link href={`/agenda/${id}/bewerken`} className="card flex items-center gap-3 px-4 py-3 font-black hover:bg-cream">
        ✏️ <span className="flex-1">Naam, datum, locatie, host of games wijzigen</span>
        <ChevronRight size={18} strokeWidth={3} />
      </Link>
    </div>
  );
}

function StatusButton({
  id,
  status,
  className,
  confirm,
  children,
}: {
  id: string;
  status: string;
  className: string;
  confirm?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={setNightStatus} className={className.includes("col-span-2") ? "col-span-2" : ""}>
      <input type="hidden" name="night_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <SubmitButton className={`${className.replace("col-span-2", "")} w-full`} confirm={confirm}>
        {children}
      </SubmitButton>
    </form>
  );
}
