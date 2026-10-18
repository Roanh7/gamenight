import Link from "next/link";
import { CalendarDays, MapPin, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivity, getComments, getGames, getLeaderboards, getProfiles, getReactions, getResults, nightGameOrder, tallyVotes } from "@/lib/data";
import { bountyHits, currentBountyTarget, currentSeason, filterSeason, seasonChampions, seasonLabel, standings } from "@/lib/stats";
import { computeAchievements } from "@/lib/achievements";
import { mvpCounts } from "@/lib/records";
import { currentStreak, nextAchievement, pickRival, playerMessage, recentForm } from "@/lib/hub";
import { computeXp, getAttendance } from "@/lib/xp";
import { getMyActiveNight } from "@/lib/live";
import type { ReactNode } from "react";
import type { GameNight, Participant, Profile, Vote as VoteT } from "@/lib/types";
import type { Standing } from "@/lib/stats";
import type { XpInfo } from "@/lib/xp";
import type { HubMessage, Rival } from "@/lib/hub";
import { formatDateLong, formatTime, hoursAgoIso, nowMs } from "@/lib/format";
import { Avatar } from "./Avatar";
import { ActivityFeed } from "./ActivityFeed";
import { EmptyState, SectionTitle } from "./ui";
import { FuseCountdown } from "./FuseCountdown";
import { PushPrompt } from "./PushPrompt";
import { InstallHint } from "./InstallHint";
import { TrophySprite } from "./TrophyCabinet";

/** Het persoonlijke videogame-dashboard op Home. */
export async function PlayerHub({ userId, welcome }: { userId: string; welcome: boolean }) {
  const supabase = await createClient();
  const since = hoursAgoIso(12);

  const [profiles, games, results, activity, nightsRes, attendance, boards, hostedRes, active] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
    getActivity(supabase, 4),
    supabase
      .from("game_nights")
      .select("*")
      .eq("is_practice", false)
      .or(`status.eq.live,and(status.eq.planned,starts_at.gte.${since})`)
      .order("starts_at", { ascending: true })
      .limit(3),
    getAttendance(supabase),
    getLeaderboards(supabase),
    supabase
      .from("game_nights")
      .select("id", { count: "exact", head: true })
      .eq("host_id", userId)
      .eq("status", "finished")
      .eq("is_practice", false),
    getMyActiveNight(),
  ]);
  const me = profiles.byId.get(userId);
  const name = me?.username ?? "Player";

  // ---------- Speler ----------
  const xp = computeXp(results, attendance)(userId);
  const mine = results.filter((r) => r.user_id === userId);
  const wins = mine.filter((r) => r.is_winner).length;
  const winRate = mine.length ? Math.round((wins / mine.length) * 100) : null;
  const streak = currentStreak(results, userId);
  const form = recentForm(results, userId);
  const mvps = mvpCounts(results).get(userId) ?? 0;

  const season = currentSeason();
  const table = standings(filterSeason(results, season));
  const mySeason = table.find((s) => s.user_id === userId);
  const rival = pickRival(table, userId);
  const rivalProfile = rival ? profiles.byId.get(rival.user_id) : undefined;
  const target = currentBountyTarget(results);
  const targetName = target ? profiles.byId.get(target)?.username : undefined;

  const wonSeasons = [...seasonChampions(results).values()].filter((u) => u === userId).length;
  const ach = computeAchievements({
    userId,
    results: mine,
    leaderboard: boards,
    games: games.list,
    hostedNights: hostedRes.count ?? 0,
    seasonTitles: wonSeasons,
    bounties: bountyHits(results).get(userId) ?? 0,
  });
  const next = nextAchievement(ach.list);
  const earnedCount = ach.list.filter((a) => a.earned).length;

  const msg = playerMessage({
    played: mine.length,
    wins,
    seasonRank: mySeason?.rank ?? null,
    seasonPlayed: mySeason?.played ?? 0,
    streak,
    lastWon: form.length > 0 && form[form.length - 1],
    rival,
    rivalName: rivalProfile?.username,
  });

  // ---------- Volgende avond ----------
  const upcoming = (nightsRes.data ?? []) as GameNight[];
  const nextNight = upcoming.find((n) => n.status === "live") ?? upcoming[0];
  let people: Participant[] = [];
  let votes: VoteT[] = [];
  if (nextNight) {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("participants").select("*").eq("night_id", nextNight.id),
      supabase.from("votes").select("*").eq("night_id", nextNight.id),
    ]);
    people = (p ?? []) as Participant[];
    votes = (v ?? []) as VoteT[];
  }
  const confirmed = people.filter((p) => p.status === "confirmed");
  const myPart = people.find((p) => p.user_id === userId);
  const isHost = !!nextNight && (nextNight.host_id === userId || nextNight.cohost_id === userId);
  const myStatus = isHost
    ? { text: nextNight!.host_id === userId ? "👑 Jij bent host" : "🎙️ Jij bent co-host", cls: "bg-yellow text-night" }
    : myPart?.status === "confirmed"
      ? { text: "✅ Je bent erbij", cls: "bg-green-soft" }
      : myPart
        ? { text: "⏳ Wacht op de host", cls: "bg-yellow-soft" }
        : { text: "Nog niet aangemeld", cls: "bg-red-soft" };
  const isFixed = nextNight?.vote_mode === "fixed";
  const myVote = isFixed || votes.some((v) => v.user_id === userId);
  const gameNames = (nextNight ? nightGameOrder(nextNight, votes) : [])
    .map((g) => games.byId.get(g)?.name)
    .filter(Boolean) as string[];
  const tally = tallyVotes(votes);

  // ---------- Nieuws ----------
  const nightIds = [...new Set(activity.map((a) => a.night_id).filter(Boolean))] as string[];
  const [{ data: feedNights }, reactions, comments] = await Promise.all([
    nightIds.length ? supabase.from("game_nights").select("id, title").in("id", nightIds) : Promise.resolve({ data: [] }),
    getReactions(supabase, activity.map((a) => a.id), userId, profiles.byId),
    getComments(supabase, activity.map((a) => a.id)),
  ]);
  const nightsById = new Map((feedNights ?? []).map((n) => [n.id, n]));

  const confirmedProfiles = confirmed.map((p) => profiles.byId.get(p.user_id)).filter(Boolean) as Profile[];
  const news = (
    <>
      {/* ---------- Nieuws ---------- */}
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
            me={{ id: userId, name }}
            reactions={reactions}
            comments={comments}
          />
        ) : (
          <EmptyState icon={<Newspaper size={32} />} title="Nog geen nieuws" text="Hier zie je straks wie er wint en stijgt." />
        )}
    </>
  );

  return (
    <HubView
      d={{
        welcome, active, name, me, xp, mySeason: mySeason ?? null, season, streak, msg, target, targetName, userId,
        winRate, form, mvps, nextNight: nextNight ?? null, confirmedProfiles, myStatus, isFixed, voters: tally.voters,
        gameNames, isHost, myPart: myPart ?? null, myVote, next, earnedCount, achTotal: ach.list.length,
        rival, rivalProfile: rivalProfile ?? null,
      }}
      news={news}
    />
  );
}

export type HubData = {
  welcome: boolean;
  active: { id: string; title: string; practice?: boolean } | null;
  name: string;
  me: Profile | undefined;
  xp: XpInfo;
  mySeason: Standing | null;
  season: string;
  streak: { wins: number; losses: number };
  msg: HubMessage;
  target: string | null;
  targetName: string | undefined;
  userId: string;
  winRate: number | null;
  form: boolean[];
  mvps: number;
  nextNight: GameNight | null;
  confirmedProfiles: Profile[];
  myStatus: { text: string; cls: string };
  isFixed: boolean;
  voters: number;
  gameNames: string[];
  isHost: boolean;
  myPart: Participant | null;
  myVote: boolean;
  next: ReturnType<typeof nextAchievement>;
  earnedCount: number;
  achTotal: number;
  rival: Rival | null;
  rivalProfile: Profile | null;
};

/** Weergave van de Player Hub (los van het ophalen, zodat we hem met testgegevens kunnen bekijken). */
export function HubView({ d, news }: { d: HubData; news: ReactNode }) {
  const {
    welcome, active, name, me, xp, mySeason, season, streak, msg, target, targetName, userId, winRate, form, mvps,
    nextNight, confirmedProfiles, myStatus, isFixed, voters, gameNames, isHost, myPart, myVote, next, earnedCount,
    achTotal, rival, rivalProfile,
  } = d;
  const blocks = 12;
  const filled = Math.min(blocks, Math.floor((xp.into / xp.span) * blocks));
  return (
    <div>
      <InstallHint />
      <PushPrompt />

      {/* Live Game Mode heeft voorrang */}
      {active && (
        <Link href="/live" className="card mb-4 flex items-center gap-3 bg-red p-3 text-white active:translate-y-[2px]">
          <span className="pixel blink text-[10px]">● {active.practice ? "OEFENING" : "LIVE"}</span>
          <span className="min-w-0 flex-1 truncate font-black">{active.title}</span>
          <span className="shrink-0 text-sm font-black">Naar live →</span>
        </Link>
      )}

      {/* ---------- Spelerskaart ---------- */}
      <section className="card relative overflow-hidden bg-red text-white" aria-label="Jouw spelerskaart">
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full border-2 border-line bg-yellow opacity-90" aria-hidden />
        <div className="relative p-4 pb-3">
          <p className="pixel text-[9px] opacity-90">{welcome ? "NEW PLAYER JOINED!" : "PLAYER 1"}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="hub-avatar shrink-0">
              <Avatar name={name} color={me?.avatar_color} url={me?.avatar_url} emoji={me?.avatar_emoji} size="xl" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className={`break-words font-black leading-tight ${name.length > 12 ? "text-xl" : "text-2xl"}`}>{name}</h1>
              <p className="pixel mt-1 text-[10px] leading-relaxed">
                LV {xp.level} <span className="opacity-80">· {xp.title.toUpperCase()}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Link href="/ranking" className="chip bg-paper py-0.5 text-[11px] text-ink">
                  🏆 {mySeason ? `#${mySeason.rank} · ${seasonLabel(season)}` : "Nog geen rank"}
                </Link>
                {streak.wins > 0 && <span className="chip bg-yellow py-0.5 text-[11px] text-night">🔥 {streak.wins} op rij</span>}
              </div>
            </div>
          </div>

          {/* XP-balk */}
          <div className="mt-4 rounded-lg border-2 border-line bg-night px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="pixel text-[9px] text-yellow">XP</span>
              <span className="text-[11px] font-black">
                {xp.into} / {xp.span}
              </span>
            </div>
            <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`${xp.into} van ${xp.span} XP naar level ${xp.level + 1}`}>
              {Array.from({ length: blocks }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 border-2 border-line ${i < filled ? "bg-yellow" : "bg-white/15"}`} />
              ))}
            </div>
            <p className="mt-1 text-[11px] font-bold opacity-80">
              {xp.xp} XP totaal · nog {xp.toNext} tot LV {xp.level + 1}
            </p>
          </div>
        </div>

        {/* Begroeting: tekstvak zoals in een RPG */}
        <div className="relative border-t-2 border-line bg-paper px-4 py-2.5 text-ink">
          <p className="pixel text-[10px] leading-relaxed text-red">
            {msg.emoji} {msg.title}
          </p>
          <p className="text-sm font-bold">{msg.text}</p>
          {targetName && target !== userId && (
            <p className="mt-1 text-xs font-bold text-muted">🎯 Versla {targetName} in een potje: +10 XP</p>
          )}
          {target === userId && <p className="mt-1 text-xs font-bold text-muted">🎯 Er staat een premie op jou!</p>}
        </div>
      </section>

      {/* ---------- Vier statistieken ---------- */}
      <section className="mt-3 grid grid-cols-4 gap-2" aria-label="Statistieken">
        <Stat label="WINRATE" value={winRate === null ? "–" : `${winRate}%`} />
        <Stat label="STREAK" value={String(streak.wins)} hint={streak.wins ? "🔥" : undefined} />
        <div className="card flex min-w-0 flex-col items-center justify-center px-1 py-2.5">
          <div className="flex h-[18px] items-center gap-[3px]" role="img" aria-label={form.length ? `Laatste ${form.length}: ${form.map((w) => (w ? "gewonnen" : "niet gewonnen")).join(", ")}` : "Nog geen potjes"}>
            {form.length ? (
              form.map((w, i) => <span key={i} className={`h-2.5 w-2.5 border-2 border-line ${w ? "bg-green" : "bg-red"}`} />)
            ) : (
              <span className="pixel text-[13px]">–</span>
            )}
          </div>
          <p className="pixel mt-1.5 text-[7px] text-muted">FORM</p>
        </div>
        <Stat label="MVP" value={String(mvps)} hint={mvps ? "👑" : undefined} />
      </section>

      {/* ---------- Volgende avond ---------- */}
      <SectionTitle
        action={
          <Link href="/agenda" className="text-xs font-extrabold text-muted hover:text-ink">
            Agenda →
          </Link>
        }
      >
        {nextNight?.status === "live" ? "Nu bezig" : "Next game night"}
      </SectionTitle>
      {nextNight ? (
        <div className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{nextNight.title}</p>
              <p className="text-sm font-bold text-muted">
                {nextNight.date_poll && nextNight.status === "planned"
                  ? "📅 Datumprikker: geef aan wanneer je kunt"
                  : `${formatDateLong(nextNight.starts_at)} · ${formatTime(nextNight.starts_at)}`}
              </p>
              {nextNight.location && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-bold text-muted">
                  <MapPin size={14} className="shrink-0" /> <span className="truncate">{nextNight.location}</span>
                </p>
              )}
            </div>
            {nextNight.status === "live" && <span className="chip bg-red text-white">● LIVE</span>}
          </div>
          {nextNight.status === "planned" && !nextNight.date_poll && (
            <FuseCountdown startsAt={nextNight.starts_at} createdAt={nextNight.created_at} serverNow={nowMs()} />
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex shrink-0 -space-x-1.5">
              {confirmedProfiles.slice(0, 5).map((pr) => (
                <Avatar key={pr.id} name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} size="xs" />
              ))}
            </div>
            <span className="flex-1 whitespace-nowrap text-xs font-bold text-muted">{confirmedProfiles.length} bevestigd</span>
            <span className={`chip shrink-0 py-0.5 text-[11px] ${myStatus.cls}`}>{myStatus.text}</span>
          </div>
          {gameNames.length > 0 && (
            <p className="mt-2 truncate text-xs font-bold text-muted">
              🎮 {isFixed ? "" : `Populairst (${voters} gestemd): `}
              {gameNames.slice(0, 3).join(", ")}
              {gameNames.length > 3 ? ` +${gameNames.length - 3}` : ""}
            </p>
          )}
          {nextNight.status === "live" && active?.id === nextNight.id ? (
            <Link href="/live" className="btn btn-primary mt-3 w-full">
              ▶ Naar Live Game Mode
            </Link>
          ) : (
            <Link href={`/agenda/${nextNight.id}`} className="btn btn-primary mt-3 w-full">
              {nextNight.status === "planned" && !isHost && (!myPart || !myVote)
                ? `▶ ${!myPart ? "Aanmelden" : ""}${!myPart && !myVote ? " & " : ""}${!myVote ? (myPart ? "Stem op games" : "stemmen") : ""}`
                : "▶ Open avond"}
            </Link>
          )}
        </div>
      ) : (
        <div className="card p-5 text-center">
          <p className="pixel text-[10px] leading-relaxed">NO UPCOMING GAME NIGHT</p>
          <p className="mt-1 text-sm font-bold text-muted">Tijd om er een te plannen?</p>
          <Link href="/agenda" className="btn btn-primary btn-sm mt-3">
            <CalendarDays size={16} strokeWidth={3} /> Naar de agenda
          </Link>
        </div>
      )}

      {/* ---------- Next achievement + rival ---------- */}
      <div className="mt-7 grid grid-cols-1 gap-3">
        <section className="card p-3.5" aria-label="Next achievement">
          <div className="flex items-center justify-between">
            <h2 className="pixel text-[10px]">NEXT ACHIEVEMENT</h2>
            <span className="pixel text-[8px] text-muted">
              {earnedCount}/{achTotal}
            </span>
          </div>
          {next ? (
            <div className="mt-2.5 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-night">
                <TrophySprite name={next.achievement.icon === "trophy" ? "cup" : next.achievement.icon} size={40} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black uppercase leading-tight">{next.achievement.title}</p>
                <p className="text-xs text-muted">{next.achievement.description}</p>
                {next.goal !== null && next.done !== null && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex flex-1 gap-[3px]" role="img" aria-label={`Voortgang ${next.done} van ${next.goal}`}>
                      {Array.from({ length: next.goal }, (_, i) => (
                        <span key={i} className={`h-2.5 flex-1 border-2 border-line ${i < next.done! ? "bg-green" : "bg-soft"}`} />
                      ))}
                    </div>
                    <span className="pixel shrink-0 text-[9px]">
                      {next.done}/{next.goal}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm font-black">🏆 Alle achievements behaald! Jij bent de eindbaas.</p>
          )}
        </section>

        <section className="card p-3.5" aria-label="Your rival">
          <h2 className="pixel text-[10px]">YOUR RIVAL</h2>
          {rival && rivalProfile ? (
            <div className="mt-2.5 flex items-center gap-3">
              <Avatar name={rivalProfile.username} color={rivalProfile.avatar_color} url={rivalProfile.avatar_url} emoji={rivalProfile.avatar_emoji} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{rivalProfile.username}</p>
                <p className="text-xs font-bold text-muted">
                  #{rival.rank} · {rival.points} pt ·{" "}
                  {rival.diff === 0 ? "gelijk met jou" : rival.ahead ? `${rival.diff} pt vóór jou` : `${rival.diff} pt achter jou`}
                </p>
              </div>
              <Link href={`/spelers/${encodeURIComponent(rivalProfile.username)}`} className="btn btn-secondary btn-sm shrink-0">
                Profiel
              </Link>
            </div>
          ) : (
            <p className="mt-2 text-sm font-bold text-muted">
              {mySeason ? "Nog niemand anders op de ranglijst van dit seizoen." : `Speel een potje in ${seasonLabel(season)} om een rivaal te krijgen.`}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">De speler die dit seizoen het dichtst bij jou staat in punten.</p>
        </section>
      </div>

      {/* ---------- Snelkoppelingen ---------- */}
      <nav className="mt-3 grid grid-cols-4 gap-2" aria-label="Snel naar">
        {[
          ["/account", "🕹️", "MY PROFILE"],
          ["/ranking", "🏆", "RANKINGS"],
          ["/account#trofeekast", "🏅", "ACHIEVE­MENTS"],
          ["/records", "📜", "RECORD BOOK"],
        ].map(([href, icon, label]) => (
          <Link key={href} href={href} className="card flex min-h-[72px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-center active:translate-y-[2px]">
            <span className="text-xl leading-none">{icon}</span>
            <span className="pixel text-[7px] leading-snug">{label}</span>
          </Link>
        ))}
      </nav>

      {news}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card flex min-w-0 flex-col items-center justify-center px-1 py-2.5">
      <p className="pixel flex h-[18px] items-center text-[13px] leading-none">
        {value}
        {hint && <span className="ml-0.5 text-[11px]">{hint}</span>}
      </p>
      <p className="pixel mt-1.5 text-[7px] text-muted">{label}</p>
    </div>
  );
}
