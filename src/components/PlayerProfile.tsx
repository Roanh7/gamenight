import Link from "next/link";
import { Crown, Flame, Home, Lock, Medal, Sparkles, Star, Swords, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGames, getLeaderboards, getOverall, getProfiles, getResults } from "@/lib/data";
import { allHeadToHeads, headToHead, seasonChampions, seasonLabel, type HeadToHead } from "@/lib/stats";
import { computeAchievements } from "@/lib/achievements";
import type { Game, Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { EmptyState, RankBadge, SectionTitle } from "./ui";

const ICONS = { trophy: Trophy, flame: Flame, crown: Crown, star: Star, sparkles: Sparkles, home: Home, swords: Swords, medal: Medal };

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
  const [games, boards, overall, allResults, profiles, { count: hosted }] = await Promise.all([
    getGames(supabase),
    getLeaderboards(supabase),
    getOverall(supabase),
    getResults(supabase),
    getProfiles(supabase),
    supabase
      .from("game_nights")
      .select("id", { count: "exact", head: true })
      .eq("host_id", profile.id)
      .eq("status", "finished"),
  ]);
  const results = allResults.filter((r) => r.user_id === profile.id);
  const seasonTitles = [...seasonChampions(allResults).entries()]
    .filter(([, u]) => u === profile.id)
    .map(([season]) => `Seizoenskampioen ${seasonLabel(season)}`);
  const ach = computeAchievements({
    userId: profile.id,
    results,
    leaderboard: boards,
    games: games.list,
    hostedNights: hosted ?? 0,
    seasonTitles: seasonTitles.length,
  });
  const titles = [...seasonTitles.map((t) => `🏆 ${t}`), ...ach.titles.map((t) => `👑 ${t}`)];
  const versus = !isMe && viewerId ? headToHead(allResults, viewerId, profile.id) : null;
  const rivals = isMe ? allHeadToHeads(allResults, profile.id) : [];
  const myBoards = boards
    .filter((b) => b.user_id === profile.id)
    .sort((a, b) => a.rank - b.rank || b.points - a.points);
  const myOverall = overall.find((o) => o.user_id === profile.id);
  const winRate = ach.stats.played ? Math.round((ach.stats.wins / ach.stats.played) * 100) : 0;
  const since = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(
    new Date(profile.created_at),
  );

  return (
    <div>
      {/* Spelerskaart */}
      <section className="card overflow-hidden">
        <div className="h-14 border-b-2 border-line bg-red" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 14px, rgba(255,255,255,.12) 14px 28px)" }} />
        <div className="-mt-10 px-5 pb-5">
          <Avatar name={profile.username} color={profile.avatar_color} url={profile.avatar_url} emoji={profile.avatar_emoji} size="xl" crown={titles.length > 0} />
          <h1 className="mt-2 text-2xl font-black">{profile.username}</h1>
          {profile.bio && <p className="mt-0.5 text-sm">{profile.bio}</p>}
          <p className="mt-1 text-xs font-bold text-muted">Speler sinds {since}</p>
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

      {/* Rankings per game */}
      <SectionTitle>{isMe ? "Mijn rankings" : "Rankings"}</SectionTitle>
      {myBoards.length ? (
        <ul className="card divide-y-2 divide-soft overflow-hidden">
          {myBoards.map((b) => {
            const g = games.byId.get(b.game_id);
            if (!g) return null;
            return (
              <li key={b.game_id}>
                <Link href={`/games/${g.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                  <GameIcon icon={g.icon} color={g.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">{g.name}</p>
                    <p className="text-xs font-bold text-muted">
                      {b.wins} {b.wins === 1 ? "zege" : "zeges"} · {b.played} gespeeld · {b.points} pt
                    </p>
                  </div>
                  <RankBadge rank={b.rank} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Trophy size={32} />} title="Nog geen rankings" text="Speel een potje om op de ranglijst te komen." />
      )}

      {/* Achievements */}
      <SectionTitle>
        Achievements ({ach.list.filter((a) => a.earned).length}/{ach.list.length})
      </SectionTitle>
      <ul className="grid grid-cols-2 gap-3">
        {ach.list.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <li
              key={a.id}
              className={`card p-3 ${a.earned ? "" : "border-dashed opacity-60 shadow-none"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 border-line ${
                    a.earned ? "bg-yellow" : "bg-soft"
                  }`}
                >
                  {a.earned ? <Icon size={18} strokeWidth={2.5} /> : <Lock size={16} strokeWidth={2.5} />}
                </span>
                {!a.earned && a.progress && <span className="pixel text-[9px] text-muted">{a.progress}</span>}
              </div>
              <p className="mt-2 text-sm font-black leading-tight">{a.title}</p>
              <p className="text-xs text-muted">{a.description}</p>
            </li>
          );
        })}
      </ul>
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
      <div className="grid grid-cols-3 items-center bg-ink px-4 py-4 text-center text-white">
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
