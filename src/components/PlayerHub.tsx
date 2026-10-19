import Link from "next/link";
import { CalendarDays, MapPin, Newspaper } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActivity, getAttendanceExtras, getGames, getLeaderboards, getProfiles, getResults, nightGameOrder, tallyVotes } from "@/lib/data";
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
import { FuseCountdown } from "./FuseCountdown";
import { PushPrompt } from "./PushPrompt";
import { InstallHint } from "./InstallHint";
import { TrophySprite } from "./TrophyCabinet";
import { Banner } from "./Banner";
import { BannerUnlock } from "./BannerUnlock";
import { HubAttendance } from "./Attendance";
import { attendanceModel, type AttStats } from "@/lib/attendance";
import { ownedBanners, shownBanner, syncBanners, unseenBanners } from "@/lib/bannerSync";
import { unseenFrames } from "@/lib/frames";
import { FrameUnlock } from "./FrameUnlock";
import { PixelIcon } from "./PixelIcon";

/** Het persoonlijke videogame-dashboard op Home. */
export async function PlayerHub({ userId, welcome }: { userId: string; welcome: boolean }) {
  const supabase = await createClient();
  const since = hoursAgoIso(12);

  const [profiles, games, results, activity, nightsRes, attendance, boards, hostedRes, active, allNights, allParts, attExtras] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
    getActivity(supabase, 2),
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
    supabase.from("game_nights").select("id, starts_at, status, is_practice"),
    supabase.from("participants").select("night_id, user_id, status"),
    getAttendanceExtras(supabase),
  ]);
  const me = profiles.byId.get(userId);
  // 📅 Aanwezigheid (zelfde berekening als in de Agenda)
  const attStats = attendanceModel({
    nights: (allNights.data ?? []) as { id: string; starts_at: string; status: string; is_practice: boolean }[],
    results,
    participants: (allParts.data ?? []) as { night_id: string; user_id: string; status: string }[],
    declines: attExtras.declines,
    marks: attExtras.marks,
  }).stats(userId, me?.created_at ?? new Date(0).toISOString());
  const name = me?.username ?? "Player";

  // ---------- Speler ----------
  const xpOf = computeXp(results, attendance);
  const xp = xpOf(userId);
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

  // ---------- Nieuws (alleen de laatste twee, compact; alles staat op /nieuws) ----------
  const nightIds = [...new Set(activity.map((a) => a.night_id).filter(Boolean))] as string[];
  const { data: feedNights } = nightIds.length ? await supabase.from("game_nights").select("id, title").in("id", nightIds) : { data: [] };
  const nightsById = new Map((feedNights ?? []).map((n) => [n.id, n]));

  // Banners van iedereen bijwerken (schrijft alleen als er iets nieuws is)
  const { rows: bannerRows } = await syncBanners(supabase, { userIds: profiles.list.map((p) => p.id), results, attendance, xpOf });
  const banner = shownBanner(me?.banner, ownedBanners(bannerRows, userId));
  const confirmedProfiles = confirmed.map((p) => profiles.byId.get(p.user_id)).filter(Boolean) as Profile[];
  const news =
    activity.length > 0 ? (
      <ActivityFeed items={activity} profiles={profiles.byId} games={games.byId} nights={nightsById} compact />
    ) : (
      <p className="px-3 py-4 text-center text-sm font-bold text-muted">
        <Newspaper size={18} className="mr-1 inline" /> Nog geen nieuws. Hier zie je straks wie er wint en stijgt.
      </p>
    );

  return (
    <HubView
      d={{
        welcome, active, name, me, xp, mySeason: mySeason ?? null, season, streak, msg, target, targetName, userId,
        winRate, form, mvps, nextNight: nextNight ?? null, confirmedProfiles, myStatus, isFixed, voters: tally.voters,
        gameNames, isHost, myPart: myPart ?? null, myVote, next, earnedCount, achTotal: ach.list.length,
        rival, rivalProfile: rivalProfile ?? null, banner, attStats,
      }}
      news={news}
      overlays={
        <>
          <BannerUnlock ids={unseenBanners(bannerRows, userId)} userId={userId} />
          {unseenBanners(bannerRows, userId).length === 0 && me && (
            <FrameUnlock ids={unseenFrames(bannerRows, userId)} userId={userId} name={me.username} color={me.avatar_color} emoji={me.avatar_emoji} pixel={me.avatar_pixel} />
          )}
        </>
      }
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
  banner: string;
  attStats?: AttStats;
};


/** Paneel met een gekleurde kopregel (Home): houdt de onderdelen visueel bij elkaar. */
function HubPanel({
  title,
  icon,
  tone,
  action,
  children,
  label,
}: {
  title: string;
  icon?: ReactNode;
  tone: string;
  action?: ReactNode;
  children: ReactNode;
  label?: string;
}) {
  return (
    <section className="hub-panel" style={{ ["--panel" as string]: tone }} aria-label={label ?? title}>
      <div className="hub-panel-head">
        <h2 className="pixel flex min-w-0 items-center gap-1.5 truncate text-[9px]">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Weergave van de Player Hub (los van het ophalen, zodat we hem met testgegevens kunnen bekijken). */
export function HubView({ d, news, overlays }: { d: HubData; news: ReactNode; overlays?: ReactNode }) {
  const {
    welcome, active, name, me, xp, mySeason, season, streak, msg, target, targetName, userId, winRate, form, mvps,
    nextNight, confirmedProfiles, myStatus, isFixed, voters, gameNames, isHost, myPart, myVote, next, earnedCount,
    achTotal, rival, rivalProfile, banner, attStats,
  } = d;
  const blocks = 12;
  const filled = Math.min(blocks, Math.floor((xp.into / xp.span) * blocks));
  const headLink = "shrink-0 text-[11px] font-black text-ink hover:underline";
  return (
    <div className="space-y-3">
      {overlays}
      <InstallHint />
      <PushPrompt />

      {/* Live Game Mode heeft voorrang */}
      {active && (
        <Link href="/live" className="card flex items-center gap-3 bg-red p-3 text-white active:translate-y-[2px]">
          <span className="pixel blink text-[10px]">● {active.practice ? "OEFENING" : "LIVE"}</span>
          <span className="min-w-0 flex-1 truncate font-black">{active.title}</span>
          <span className="shrink-0 text-sm font-black">Naar live →</span>
        </Link>
      )}

      {/* ---------- 1. Player Card ---------- */}
      <section className="card player-card overflow-hidden" aria-label="Jouw spelerskaart">
        {/* De gekozen banner (elke banner, ook toekomstige) */}
        <div className="relative h-28 border-b-2 border-line">
          <Banner id={banner} />
          <p className="pixel absolute left-3 top-2.5 rounded bg-night/75 px-1.5 py-1 text-[8px] text-white">{welcome ? "NEW PLAYER JOINED!" : "PLAYER 1"}</p>
          <Link
            href="/account/banners"
            aria-label="Banner wijzigen"
            className="header-key absolute right-2 top-2 h-8 w-8 text-sm"
          >
            🎨
          </Link>
        </div>

        <div className="relative px-4 pb-3 pt-2">
          {/* Avatar valt half over de banner; tik = je profiel */}
          <Link href="/account" className="hub-avatar absolute -top-11 left-4" aria-label="Mijn profiel">
            <Avatar name={name} color={me?.avatar_color} url={me?.avatar_url} emoji={me?.avatar_emoji} pixel={me?.avatar_pixel} frame={me?.avatar_frame} size="xl" />
          </Link>
          <div className="ml-[96px] min-h-[44px] min-w-0">
            <Link href="/account" className="block min-w-0 hover:underline">
              <h1 className={`break-words font-black leading-tight ${name.length > 12 ? "text-lg" : "text-xl"}`}>{name}</h1>
            </Link>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="pixel rounded-md border-2 border-line bg-red px-1.5 py-0.5 text-[9px] text-white">LV {xp.level}</span>
              <span className="pixel text-[8px] text-muted">{xp.title.toUpperCase()}</span>
            </p>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Link href="/ranking" className="chip bg-yellow-soft py-0.5 text-[11px]">
              🏆 {mySeason ? `#${mySeason.rank} · ${seasonLabel(season)}` : `Nog geen rank · ${seasonLabel(season)}`}
            </Link>
            {streak.wins > 0 && <span className="chip bg-orange-soft py-0.5 text-[11px]">🔥 {streak.wins} op rij</span>}
          </div>

          {/* XP-balk */}
          <div className="xp-panel mt-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="pixel text-[9px] text-red">XP</span>
              <span className="pixel text-[9px]">
                {xp.into}/{xp.span}
              </span>
            </div>
            <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`${xp.into} van ${xp.span} XP naar level ${xp.level + 1}`}>
              {Array.from({ length: blocks }, (_, i) => (
                <span key={i} className={`xp-block ${i < filled ? "is-on" : ""}`} />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-bold text-muted">
              {xp.xp} XP totaal · nog {xp.toNext} tot LV {xp.level + 1}
            </p>
          </div>
        </div>

        {/* Begroeting: tekstvak zoals in een RPG */}
        <div className="border-t-2 border-line bg-cream px-4 py-2.5">
          <p className="pixel text-[9px] leading-relaxed text-red">
            {msg.emoji} {msg.title}
          </p>
          <p className="text-sm font-bold">{msg.text}</p>
          {targetName && target !== userId && <p className="mt-1 text-xs font-bold text-muted">🎯 Versla {targetName} in een potje: +10 XP</p>}
          {target === userId && <p className="mt-1 text-xs font-bold text-muted">🎯 Er staat een premie op jou!</p>}
        </div>
      </section>

      {/* ---------- 2. HUD ---------- */}
      <section className="grid grid-cols-4 gap-2" aria-label="Statistieken">
        <HudTile icon="target" tone="var(--color-green)" label="WINRATE" value={winRate === null ? "–" : `${winRate}%`} />
        <HudTile icon="flame" tone="var(--color-orange)" label="STREAK" value={String(streak.wins)} />
        <div className="hud-tile" style={{ ["--hud" as string]: "var(--color-blue)" }}>
          <PixelIcon name="bars" size={14} className="hud-icon" />
          <div
            className="flex h-[20px] items-center gap-[3px]"
            role="img"
            aria-label={form.length ? `Laatste ${form.length}: ${form.map((w) => (w ? "gewonnen" : "niet gewonnen")).join(", ")}` : "Nog geen potjes"}
          >
            {form.length ? (
              form.map((w, i) => <span key={i} className={`h-2.5 w-2.5 border-2 border-line ${w ? "bg-green" : "bg-red"}`} />)
            ) : (
              <span className="pixel text-[15px]">–</span>
            )}
          </div>
          <p className="pixel text-[7px] text-muted">FORM</p>
        </div>
        <HudTile icon="crown" tone="var(--color-yellow)" label="MVP" value={String(mvps)} />
      </section>

      {/* ---------- 3. Next game night ---------- */}
      <HubPanel
        title={nextNight?.status === "live" ? "NU BEZIG" : "NEXT GAME NIGHT"}
        icon={<PixelIcon name="calendar" size={12} />}
        tone="var(--color-blue-soft)"
        action={
          <Link href="/agenda" className={headLink}>
            Agenda ▶
          </Link>
        }
      >
        {nextNight ? (
          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-lg font-black leading-tight">{nextNight.title}</p>
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
                  <Avatar key={pr.id} name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} pixel={pr.avatar_pixel} frame={pr.avatar_frame} size="xs" />
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
          <div className="p-4 text-center">
            <p className="pixel text-[10px] leading-relaxed">NO UPCOMING GAME NIGHT</p>
            <p className="mt-1 text-sm font-bold text-muted">Tijd om er een te plannen?</p>
            <Link href="/agenda" className="btn btn-primary btn-sm mt-3">
              <CalendarDays size={16} strokeWidth={3} /> Naar de agenda
            </Link>
          </div>
        )}
      </HubPanel>

      {/* ---------- 4. Game Night News (laatste 2) ---------- */}
      <HubPanel title="GAME NIGHT NEWS" icon={<PixelIcon name="news" size={12} />} tone="var(--color-yellow-soft)">
        {news}
        <Link href="/nieuws" className="hub-panel-foot">
          BEKIJK ALLES ▶
        </Link>
      </HubPanel>

      {/* ---------- 5. My Attendance ---------- */}
      {attStats && <HubAttendance s={attStats} />}

      {/* ---------- Quests: volgende achievement + rivaal ---------- */}
      <HubPanel title="QUESTS" icon={<span aria-hidden>⚔️</span>} tone="var(--color-purple-soft)" label="Next achievement en rivaal">
        <div className="divide-y-2 divide-soft">
          <div className="flex items-center gap-3 px-3 py-2.5" aria-label="Next achievement">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-night">
              {next ? <TrophySprite name={next.achievement.icon === "trophy" ? "cup" : next.achievement.icon} size={34} /> : <span>🏆</span>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="pixel text-[7px] text-muted">
                NEXT ACHIEVEMENT · {earnedCount}/{achTotal}
              </p>
              {next ? (
                <>
                  <p className="truncate font-black uppercase leading-tight">{next.achievement.title}</p>
                  <p className="line-clamp-2 text-xs text-muted">{next.achievement.description}</p>
                  {next.goal !== null && next.done !== null && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex flex-1 gap-[3px]" role="img" aria-label={`Voortgang ${next.done} van ${next.goal}`}>
                        {Array.from({ length: next.goal }, (_, i) => (
                          <span key={i} className={`h-2 flex-1 border-2 border-line ${i < next.done! ? "bg-green" : "bg-soft"}`} />
                        ))}
                      </div>
                      <span className="pixel shrink-0 text-[8px]">
                        {next.done}/{next.goal}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm font-black">Alle achievements behaald! Jij bent de eindbaas.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5" aria-label="Your rival">
            {rival && rivalProfile ? (
              <>
                <Avatar name={rivalProfile.username} color={rivalProfile.avatar_color} url={rivalProfile.avatar_url} emoji={rivalProfile.avatar_emoji} pixel={rivalProfile.avatar_pixel} frame={rivalProfile.avatar_frame} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="pixel text-[7px] text-muted">YOUR RIVAL</p>
                  <p className="truncate font-black">{rivalProfile.username}</p>
                  <p className="text-xs font-bold text-muted">
                    #{rival.rank} · {rival.points} pt · {rival.diff === 0 ? "gelijk met jou" : rival.ahead ? `${rival.diff} pt vóór jou` : `${rival.diff} pt achter jou`}
                  </p>
                </div>
                <Link href={`/spelers/${encodeURIComponent(rivalProfile.username)}`} className="btn btn-secondary btn-sm shrink-0 px-2.5 text-xs">
                  Profiel
                </Link>
              </>
            ) : (
              <div className="min-w-0">
                <p className="pixel text-[7px] text-muted">YOUR RIVAL</p>
                <p className="text-sm font-bold text-muted">
                  {mySeason ? "Nog niemand anders op de ranglijst van dit seizoen." : `Speel een potje in ${seasonLabel(season)} om een rivaal te krijgen.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </HubPanel>

      {/* ---------- Snelkoppelingen ---------- */}
      <nav className="grid grid-cols-4 gap-2" aria-label="Snel naar">
        {[
          ["/account", "🕹️", "MY PROFILE"],
          ["/ranking", "🏆", "RANKINGS"],
          ["/account#trofeekast", "🏅", "ACHIEVE­MENTS"],
          ["/records", "📜", "RECORD BOOK"],
        ].map(([href, icon, label]) => (
          <Link key={href} href={href} className="hub-key">
            <span className="text-lg leading-none">{icon}</span>
            <span className="pixel text-[7px] leading-snug">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function HudTile({ icon, tone, label, value }: { icon: "target" | "flame" | "crown"; tone: string; label: string; value: string }) {
  return (
    <div className="hud-tile" style={{ ["--hud" as string]: tone }}>
      <PixelIcon name={icon} size={14} className="hud-icon" />
      <p className="pixel flex h-[20px] items-center text-[15px] leading-none">{value}</p>
      <p className="pixel text-[7px] text-muted">{label}</p>
    </div>
  );
}
