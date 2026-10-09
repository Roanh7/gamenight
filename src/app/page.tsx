import Link from "next/link";
import { CalendarDays, Gamepad2, Newspaper, Plus, Trophy, Vote } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getActivity, getGames, getProfiles, getReactions, getResults, nightGameOrder, tallyVotes } from "@/lib/data";
import { currentSeason, filterSeason, seasonLabel, standings } from "@/lib/stats";
import type { GameNight, Match, Participant, Vote as VoteT } from "@/lib/types";
import { countdown, formatDateLong, formatTime, hoursAgoIso, timeAgo } from "@/lib/format";
import { Logo, PixelController } from "@/components/Logo";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Avatar } from "@/components/Avatar";
import { GameIcon } from "@/components/GameIcon";
import { Leaderboard } from "@/components/Leaderboard";
import { EmptyState, SectionTitle } from "@/components/ui";
import { InstallHint } from "@/components/InstallHint";

export default async function Home(props: PageProps<"/">) {
  const me = await getMe();
  if (!me) return <Landing />;
  const sp = await props.searchParams;
  return <Dashboard userId={me.user.id} username={me.profile.username} welcome={sp.welkom === "1"} />;
}

/* ------------------------------------------------------------------ */
/* Niet ingelogd                                                       */
/* ------------------------------------------------------------------ */
function Landing() {
  const steps = [
    {
      icon: CalendarDays,
      color: "bg-blue",
      title: "Plan een avond",
      text: "Prik een datum, kies een host en zie wie er komt.",
    },
    {
      icon: Vote,
      color: "bg-purple",
      title: "Stem op de game",
      text: "Iedereen stemt. Meeste stemmen wint.",
    },
    {
      icon: Trophy,
      color: "bg-yellow",
      title: "Speel & scoor",
      text: "De host telt de punten. De ranglijst doet de rest.",
    },
  ];
  return (
    <div className="mx-auto max-w-sm">
      <section className="pt-6 text-center">
        <Logo size="lg" />
        <p className="mx-auto mt-5 max-w-xs text-lg font-bold leading-snug">
          De agenda en ranglijst voor jullie gamenights.
        </p>
        <p className="pixel blink mt-6 text-[10px] text-red">PRESS START</p>
        <div className="mt-4 grid gap-3">
          <Link href="/registreren" className="btn btn-primary">
            ▶ Account aanmaken
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Inloggen
          </Link>
        </div>
      </section>

      <div className="mt-8">
        <InstallHint />
      </div>

      <section className="mt-8">
        <h2 className="pixel mb-4 text-center text-[11px]">HOE WERKT HET?</h2>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="card flex items-center gap-4 p-4">
              <span
                className={`${s.color} ${s.color === "bg-yellow" ? "text-ink" : "text-white"} flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-line`}
              >
                <s.icon size={24} strokeWidth={2.5} />
              </span>
              <div>
                <p className="font-black">
                  <span className="pixel mr-1.5 text-[10px] text-muted">{i + 1}</span>
                  {s.title}
                </p>
                <p className="text-sm text-muted">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/uitleg" className="btn btn-secondary btn-sm mt-4 w-full">
          Lees de volledige uitleg →
        </Link>
      </section>

      <section className="card mt-8 p-5 text-center">
        <PixelController className="mx-auto mb-3 h-8 w-auto" />
        <p className="font-black">Titels, kroontjes en eeuwige roem</p>
        <p className="mt-1 text-sm text-muted">
          Per game een eigen leaderboard. Word jij Kampioen Mario Kart?
        </p>
      </section>

      <p className="mt-8 text-center text-xs text-muted">
        Alleen voor de vriendengroep. Je hebt een uitnodigingscode nodig.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ingelogd                                                            */
/* ------------------------------------------------------------------ */
async function Dashboard({
  userId,
  username,
  welcome,
}: {
  userId: string;
  username: string;
  welcome: boolean;
}) {
  const supabase = await createClient();
  const since = hoursAgoIso(12);

  const [profiles, games, results, activity, nightsRes, lastMatchesRes] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
    getActivity(supabase, 4),
    supabase
      .from("game_nights")
      .select("*")
      .or(`status.eq.live,and(status.eq.planned,starts_at.gte.${since})`)
      .order("starts_at", { ascending: true })
      .limit(3),
    supabase
      .from("matches")
      .select("*")
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(3),
  ]);

  const upcoming = (nightsRes.data ?? []) as GameNight[];
  const next = upcoming.find((n) => n.status === "live") ?? upcoming[0];
  const lastMatches = (lastMatchesRes.data ?? []) as Match[];

  let nextParticipants: Participant[] = [];
  let nextVotes: VoteT[] = [];
  if (next) {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("participants").select("*").eq("night_id", next.id),
      supabase.from("votes").select("*").eq("night_id", next.id),
    ]);
    nextParticipants = (p ?? []) as Participant[];
    nextVotes = (v ?? []) as VoteT[];
  }

  // Titels van avonden in de feed
  const nightIds = [...new Set(activity.map((a) => a.night_id).filter(Boolean))] as string[];
  const { data: feedNights } = nightIds.length
    ? await supabase.from("game_nights").select("id, title").in("id", nightIds)
    : { data: [] };
  const nightsById = new Map((feedNights ?? []).map((n) => [n.id, n]));
  const reactions = await getReactions(supabase, activity.map((a) => a.id), userId, profiles.byId);

  const season = currentSeason();
  const overall = standings(filterSeason(results, season));
  const myOverall = overall.find((o) => o.user_id === userId);
  const tally = tallyVotes(nextVotes);
  const isFixed = next?.vote_mode === "fixed";
  const nextGames = (next ? nightGameOrder(next, nextVotes) : [])
    .map((g) => games.byId.get(g))
    .filter(Boolean)
    .slice(0, 4) as typeof games.list;
  const myVote = isFixed || nextVotes.some((v) => v.user_id === userId);
  const iJoined = nextParticipants.find((p) => p.user_id === userId);

  return (
    <div>
      <InstallHint />

      {/* Begroeting */}
      <section className="card relative overflow-hidden bg-red p-5 text-white">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full border-2 border-line bg-yellow opacity-90"
          aria-hidden
        />
        <p className="pixel relative text-[10px] opacity-90">{welcome ? "NEW PLAYER JOINED!" : "PLAYER 1"}</p>
        <h1 className="relative mt-1 text-2xl font-black">
          {welcome ? `Welkom, ${username}!` : `Hoi ${username}!`}
        </h1>
        <div className="relative mt-3 flex flex-wrap gap-2">
          <span className="chip bg-paper text-ink">
            🏆 {myOverall ? `#${myOverall.rank} in ${seasonLabel(season)}` : `Nog geen ranking in ${seasonLabel(season)}`}
          </span>
          {myOverall && (
            <span className="chip bg-paper text-ink">
              {myOverall.wins} {myOverall.wins === 1 ? "zege" : "zeges"}
            </span>
          )}
        </div>
      </section>

      {/* Volgende avond */}
      <SectionTitle
        action={
          <Link href="/agenda" className="text-xs font-extrabold text-muted hover:text-ink">
            Hele agenda →
          </Link>
        }
      >
        {next?.status === "live" ? "Nu bezig" : "Volgende gamenight"}
      </SectionTitle>
      {next ? (
        <Link href={`/agenda/${next.id}`} className="card block p-4 transition-transform active:translate-y-[2px]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{next.title}</p>
              <p className="text-sm font-bold text-muted">
                {next.date_poll && next.status === "planned"
                  ? "📅 Datumprikker: geef aan wanneer je kunt"
                  : `${formatDateLong(next.starts_at)} · ${formatTime(next.starts_at)}`}
              </p>
            </div>
            <span className={`chip ${next.status === "live" ? "bg-red text-white" : "bg-yellow"}`}>
              {next.status === "live" ? "● LIVE" : next.date_poll ? "Prikker" : countdown(next.starts_at)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex -space-x-1.5">
              {nextParticipants.slice(0, 7).map((p) => {
                const pr = profiles.byId.get(p.user_id);
                return pr ? <Avatar key={p.user_id} name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} size="sm" /> : null;
              })}
            </div>
            <span className="text-xs font-bold text-muted">{nextParticipants.length} aangemeld</span>
          </div>
          <div className="mt-3 rounded-xl border-2 border-dashed border-line/40 bg-cream px-3 py-2 text-sm">
            {nextGames.length ? (
              <>
                <p className="mb-1.5 text-xs font-black text-muted">
                  {isFixed ? "Games van de avond" : `Populairst in de stemming (${tally.voters} gestemd)`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {nextGames.map((g) => (
                    <span key={g.id} className="chip bg-paper py-1 pl-1">
                      <GameIcon icon={g.icon} color={g.color} size="sm" />
                      {g.name}
                      {!isFixed && tally.counts.get(g.id) ? (
                        <span className="text-muted">· {tally.counts.get(g.id)}</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <span className="font-bold text-muted">Nog niemand gestemd</span>
            )}
          </div>
          {next.status === "planned" && (!myVote || !iJoined) && (
            <p className="mt-3 text-sm font-black text-red">
              {!iJoined ? "Meld je aan" : ""}
              {!iJoined && !myVote ? " & " : ""}
              {!myVote ? "stem op games" : ""} →
            </p>
          )}
        </Link>
      ) : (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="Nog niks gepland"
          text="Tijd voor een nieuwe gamenight?"
          action={
            <Link href="/agenda/nieuw" className="btn btn-primary btn-sm">
              <Plus size={16} strokeWidth={3} /> Plan een avond
            </Link>
          }
        />
      )}

      {/* Laatst gespeeld */}
      {lastMatches.length > 0 && (
        <>
          <SectionTitle>Laatst gespeeld</SectionTitle>
          <ul className="grid grid-cols-1 gap-2 [&>li]:min-w-0">
            {lastMatches.map((m) => {
              const g = games.byId.get(m.game_id);
              const w = m.winner_id ? profiles.byId.get(m.winner_id) : undefined;
              return (
                <li key={m.id}>
                  <Link href={`/agenda/${m.night_id}`} className="card flex items-center gap-3 p-3">
                    {g && <GameIcon icon={g.icon} color={g.color} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black">{g?.name ?? "Game"}</p>
                      <p className="text-xs font-bold text-muted">
                        {m.finished_at ? timeAgo(m.finished_at) : ""}
                      </p>
                    </div>
                    {w ? (
                      <span className="flex items-center gap-2 text-sm font-black">
                        🏆 {w.username}
                      </span>
                    ) : !m.is_draw ? (
                      <span className="text-sm font-black">🏆 {m.winning_team ?? "Teamwinst"}</span>
                    ) : (
                      <span className="chip bg-soft">Gelijkspel</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Nieuws */}
      <SectionTitle
        action={
          activity.length > 0 ? (
            <Link href="/nieuws" className="text-xs font-extrabold text-muted hover:text-ink">
              Alle nieuws →
            </Link>
          ) : undefined
        }
      >
        Latest news
      </SectionTitle>
      {activity.length > 0 ? (
        <ActivityFeed
          items={activity}
          profiles={profiles.byId}
          games={games.byId}
          nights={nightsById}
          me={{ id: userId, name: username }}
          reactions={reactions}
        />
      ) : (
        <EmptyState icon={<Newspaper size={32} />} title="Nog geen nieuws" text="Hier zie je straks wie er wint en stijgt." />
      )}

      {/* Top 3 */}
      <SectionTitle
        action={
          <Link href="/ranking" className="text-xs font-extrabold text-muted hover:text-ink">
            Alle rankings →
          </Link>
        }
      >
        Top 3 seizoen {seasonLabel(season)}
      </SectionTitle>
      {overall.length > 0 ? (
        <div className="card p-3">
          <Leaderboard rows={overall} profiles={profiles.byId} meId={userId} limit={3} compact />
        </div>
      ) : (
        <EmptyState
          icon={<Gamepad2 size={32} />}
          title="Nog geen scores"
          text={games.list.length ? "Speel een potje om op de ranglijst te komen." : "Voeg eerst jullie games toe."}
          action={
            !games.list.length ? (
              <Link href="/games/nieuw" className="btn btn-primary btn-sm">
                <Plus size={16} strokeWidth={3} /> Game toevoegen
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
