import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGames, getLeaderboards, getOverall, getProfiles, getResults } from "@/lib/data";
import { allHeadToHeads, bountyHits, currentSeason, filterSeason, headToHead, seasonChampions, seasonLabel, standings, type HeadToHead } from "@/lib/stats";
import { underdogs, underdogTally } from "@/lib/underdog";
import { UnderdogChip } from "./Underdog";
import { SPECIALIST_MIN_PLAYED, bestGames, formatRate, specialistBoards, titlesOf } from "@/lib/specialists";
import { FormDots } from "./Specialists";
import { ResultsRefresh } from "./ResultsRefresh";
import { computeAchievements } from "@/lib/achievements";
import { computeXp, getAttendance } from "@/lib/xp";
import { XpBar } from "./XpBar";
import type { Game, Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { EmptyState, SectionTitle } from "./ui";
import { TrophyCabinet, type CabinetItem } from "./TrophyCabinet";
import { Banner } from "./Banner";
import { BannerUnlock } from "./BannerUnlock";
import { ownedBanners, shownBanner, syncBanners, unseenBanners, type UnlockRow } from "@/lib/bannerSync";

export async function PlayerProfile({
  profile,
  isMe,
  viewerId,
}: {
  profile: Profile;
  isMe: boolean;
  viewerId?: string;
}) {
  const supabase = await createClient();
  const [games, boards, overall, allResults, profiles, { count: hosted }, attendance] = await Promise.all([
    getGames(supabase),
    getLeaderboards(supabase),
    getOverall(supabase),
    getResults(supabase),
    getProfiles(supabase),
    supabase
      .from("game_nights")
      .select("id", { count: "exact", head: true })
      .eq("host_id", profile.id)
      .eq("status", "finished")
      .eq("is_practice", false),
    getAttendance(supabase),
  ]);
  const xpOf = computeXp(allResults, attendance);
  const xp = xpOf(profile.id);
  // Banners: op je eigen profiel meteen bijwerken; bij een vriend alleen zijn gekozen banner tonen
  let unlockRows: UnlockRow[] = [];
  if (isMe) {
    unlockRows = (await syncBanners(supabase, { userIds: profiles.list.map((p) => p.id), results: allResults, attendance, xpOf })).rows;
  } else {
    const { data } = await supabase.from("banner_unlocks").select("user_id, banner_id, revoked_at, seen, unlocked_at").eq("user_id", profile.id);
    unlockRows = (data ?? []) as UnlockRow[];
  }
  const banner = shownBanner(profiles.byId.get(profile.id)?.banner, ownedBanners(unlockRows, profile.id));
  const results = allResults.filter((r) => r.user_id === profile.id);
  const wonSeasons = [...seasonChampions(allResults).entries()]
    .filter(([, u]) => u === profile.id)
    .map(([season]) => seasonLabel(season));
  const seasonTitles = wonSeasons.map((s) => `Seizoenskampioen ${s}`);
  const ach = computeAchievements({
    userId: profile.id,
    results,
    leaderboard: boards,
    games: games.list,
    hostedNights: hosted ?? 0,
    seasonTitles: seasonTitles.length,
    bounties: bountyHits(allResults).get(profile.id) ?? 0,
  });
  const cups: CabinetItem[] = [
    ...wonSeasons.map((s) => ({
      id: `season-${s}`,
      sprite: "cup" as const,
      title: `Seizoenskampioen ${s}`,
      description: `${profile.username} eindigde seizoen ${s} als #1`,
      earned: true,
      plaque: s,
    })),
    ...ach.titles.map((t) => ({
      id: `title-${t}`,
      sprite: "cup" as const,
      silver: true,
      title: t,
      description: `Staat nu #1 op het leaderboard van ${t.replace(/^Kampioen /, "")}`,
      earned: true,
      plaque: t.replace(/^Kampioen /, ""),
    })),
  ];
  const shelf: CabinetItem[] = ach.list.map((a) => ({
    id: a.id,
    sprite: a.icon === "trophy" ? "cup" : a.icon,
    title: a.title,
    description: a.description,
    earned: a.earned,
    progress: a.progress,
  }));
  // 🎮 Game Specialists (all-time): titels, beste game en stats per game
  const specBoards = specialistBoards(allResults);
  const specTitles = titlesOf(profile.id, specBoards, games.byId);
  const best = bestGames(profile.id, specBoards);
  const myGameStats = [...specBoards.entries()]
    .map(([game_id, b]) => ({
      game_id,
      row: b.ranked.find((x) => x.user_id === profile.id) ?? b.unranked.find((x) => x.user_id === profile.id),
      board: boards.find((x) => x.user_id === profile.id && x.game_id === game_id),
    }))
    .filter((x): x is typeof x & { row: NonNullable<typeof x.row> } => !!x.row)
    .sort((a, b) => (a.row.rank ?? 999) - (b.row.rank ?? 999) || b.row.winrate - a.row.winrate || b.row.played - a.row.played);
  const titles = [...seasonTitles.map((t) => `🏆 ${t}`), ...ach.titles.map((t) => `👑 ${t}`), ...specTitles.map((t) => `🎮 ${t.title}`)];
  const versus = !isMe && viewerId ? headToHead(allResults, viewerId, profile.id) : null;
  const rivals = isMe ? allHeadToHeads(allResults, profile.id) : [];
  const myOverall = overall.find((o) => o.user_id === profile.id);
  const udNow = underdogs(standings(filterSeason(allResults, currentSeason()))).get(profile.id);
  const udStats = underdogTally(allResults).find((t) => t.user_id === profile.id);
  const winRate = ach.stats.played ? Math.round((ach.stats.wins / ach.stats.played) * 100) : 0;
  const since = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(
    new Date(profile.created_at),
  );

  return (
    <div>
      <ResultsRefresh />
      {/* Spelerskaart */}
      {isMe && <BannerUnlock ids={unseenBanners(unlockRows, profile.id)} userId={profile.id} />}
      <section className="card overflow-hidden">
        <div className="relative h-28 border-b-2 border-line">
          <Banner id={banner} />
          {isMe && (
            <Link href="/account/banners" className="pixel absolute right-2 top-2 rounded-md border-2 border-line bg-paper/90 px-2 py-1.5 text-[8px] text-ink">
              🎨 CUSTOMIZE PROFILE
            </Link>
          )}
        </div>
        <div className="-mt-10 px-5 pb-5">
          <Avatar name={profile.username} color={profile.avatar_color} url={profile.avatar_url} emoji={profile.avatar_emoji} size="xl" crown={titles.length > 0} />
          <h1 className="mt-2 text-2xl font-black">{profile.username}</h1>
          {profile.bio && <p className="mt-0.5 text-sm">{profile.bio}</p>}
          <p className="mt-1 text-xs font-bold text-muted">Speler sinds {since}</p>
          <div className="mt-3">
            <XpBar info={xp} />
          </div>
          {titles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {titles.map((t) => (
                <span key={t} className="chip bg-yellow">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <dl className="grid grid-cols-4 border-t-2 border-line text-center">
          {[
            ["Rank", myOverall ? `#${myOverall.rank}` : "–"],
            ["Zeges", ach.stats.wins],
            ["Potjes", ach.stats.played],
            ["Win %", ach.stats.played ? `${winRate}` : "–"],
          ].map(([label, value], i) => (
            <div key={String(label)} className={`py-3 ${i > 0 ? "border-l-2 border-line" : ""}`}>
              <dt className="text-[10px] font-black uppercase text-muted">{label}</dt>
              <dd className="pixel mt-1 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
        {(udNow || udStats) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-line bg-night px-4 py-2 text-xs font-bold text-white">
            {udNow && (
              <span className="flex items-center gap-1.5">
                <UnderdogChip className="border-yellow" /> +{udNow.bonus} bij winst
              </span>
            )}
            {udStats && (
              <span>
                🐺 {udStats.wins} underdog-{udStats.wins === 1 ? "zege" : "zeges"} · +{udStats.bonus} bonuspunten
              </span>
            )}
          </div>
        )}
      </section>

      {/* Onderlinge stand */}
      {versus && (
        <>
          <SectionTitle>Jij vs {profile.username}</SectionTitle>
          <VersusCard h={versus} games={games.byId} />
        </>
      )}
      {isMe && rivals.length > 0 && (
        <>
          <SectionTitle>Onderlinge standen</SectionTitle>
          <ul className="card divide-y-2 divide-soft overflow-hidden">
            {rivals.map((h) => {
              const p = profiles.byId.get(h.opponent);
              if (!p) return null;
              const lead = h.wins > h.losses ? "bg-green-soft" : h.wins < h.losses ? "bg-red-soft" : "bg-soft";
              return (
                <li key={h.opponent}>
                  <Link href={`/spelers/${p.username}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                    <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" />
                    <span className="min-w-0 flex-1 truncate font-black">vs {p.username}</span>
                    <span className={`chip ${lead} pixel text-[10px]`}>
                      {h.wins}–{h.losses}
                    </span>
                    {h.draws > 0 && <span className="text-xs font-bold text-muted">{h.draws}×=</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 text-xs text-muted">Hoe vaak je hoger eindigde dan iemand in een potje waarin jullie allebei meededen.</p>
        </>
      )}

      {/* Statistieken per game (punten-ranking + specialist) */}
      <SectionTitle>{isMe ? "🎮 My game stats" : "🎮 Game stats"}</SectionTitle>
      {best.length > 0 && (
        <p className="mb-2 text-sm font-black">
          🔥 BEST GAME:{" "}
          {best
            .map((b) => games.byId.get(b.game_id)?.name ?? "?")
            .join(" & ")
            .toUpperCase()}{" "}
          <span className="text-xs font-bold text-muted">({formatRate(best[0].row.winrate)}% gewonnen)</span>
        </p>
      )}
      {myGameStats.length ? (
        <ul className="card divide-y-2 divide-soft overflow-hidden">
          {myGameStats.map(({ game_id, row, board }) => {
            const g = games.byId.get(game_id);
            if (!g) return null;
            return (
              <li key={game_id}>
                <Link href={`/games/${g.id}?seizoen=all#specialisten`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                  <GameIcon icon={g.icon} color={g.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{g.name}</p>
                    <p className="text-xs font-bold text-muted">
                      {row.wins}/{row.played} gewonnen · {board ? `${board.points} pt · #${board.rank} in punten` : `${row.points} pt`}
                    </p>
                    <FormDots form={row.form} />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="pixel text-[11px]">{formatRate(row.winrate)}%</p>
                    <p className="mt-1 text-[10px] font-black text-muted">
                      {row.rank ? `🎯 #${row.rank}` : `🔒 ${row.played}/${SPECIALIST_MIN_PLAYED}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Trophy size={32} />} title="Nog geen rankings" text="Speel een potje om op de ranglijst te komen." />
      )}

      {/* Trofeekast: bekers, titels en achievements */}
      <TrophyCabinet cups={cups} achievements={shelf} isMe={isMe} />
    </div>
  );
}

function VersusCard({ h, games }: { h: HeadToHead; games: Map<string, Game> }) {
  const total = h.wins + h.losses + h.draws;
  if (total === 0) {
    return (
      <div className="card p-4 text-sm font-bold text-muted">
        Jullie hebben nog geen potje tegen elkaar gespeeld. Tijd voor een duel! ⚔️
      </div>
    );
  }
  const verdict =
    h.wins > h.losses ? "Jij hebt de overhand 😎" : h.wins < h.losses ? "Je staat achter… revanche? 😤" : "Helemaal gelijk! 🤝";
  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-3 items-center bg-night px-4 py-4 text-center text-white">
        <div>
          <p className="pixel text-2xl text-yellow">{h.wins}</p>
          <p className="mt-1 text-[11px] font-black uppercase opacity-80">Gewonnen</p>
        </div>
        <div>
          <p className="pixel text-base">{h.draws}</p>
          <p className="mt-1 text-[11px] font-black uppercase opacity-80">Gelijk</p>
        </div>
        <div>
          <p className="pixel text-2xl text-[#ff8fa3]">{h.losses}</p>
          <p className="mt-1 text-[11px] font-black uppercase opacity-80">Verloren</p>
        </div>
      </div>
      <p className="border-b-2 border-line bg-cream px-4 py-2 text-center text-sm font-black">{verdict}</p>
      <ul className="divide-y-2 divide-soft">
        {[...h.perGame.entries()].map(([gameId, r]) => {
          const g = games.get(gameId);
          if (!g) return null;
          return (
            <li key={gameId} className="flex items-center gap-3 px-3 py-2">
              <GameIcon icon={g.icon} color={g.color} size="sm" />
              <span className="min-w-0 flex-1 truncate font-bold">{g.name}</span>
              <span className="pixel text-[11px]">
                {r.wins}–{r.losses}
              </span>
              {r.draws > 0 && <span className="text-xs font-bold text-muted">{r.draws}×=</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
