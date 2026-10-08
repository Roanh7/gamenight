import Link from "next/link";
import { Crown, Flame, Home, Lock, Medal, Sparkles, Star, Swords, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGames, getLeaderboards, getOverall } from "@/lib/data";
import { computeAchievements } from "@/lib/achievements";
import type { MatchResult, Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { EmptyState, RankBadge, SectionTitle } from "./ui";

const ICONS = { trophy: Trophy, flame: Flame, crown: Crown, star: Star, sparkles: Sparkles, home: Home, swords: Swords, medal: Medal };

export async function PlayerProfile({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const supabase = await createClient();
  const [games, boards, overall, { data: res }, { count: hosted }] = await Promise.all([
    getGames(supabase),
    getLeaderboards(supabase),
    getOverall(supabase),
    supabase.from("match_results").select("*").eq("user_id", profile.id),
    supabase
      .from("game_nights")
      .select("id", { count: "exact", head: true })
      .eq("host_id", profile.id)
      .eq("status", "finished"),
  ]);
  const results = (res ?? []) as MatchResult[];
  const ach = computeAchievements({
    userId: profile.id,
    results,
    leaderboard: boards,
    games: games.list,
    hostedNights: hosted ?? 0,
  });
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
          <Avatar name={profile.username} color={profile.avatar_color} size="xl" crown={ach.titles.length > 0} />
          <h1 className="mt-2 text-2xl font-black">{profile.username}</h1>
          {profile.bio && <p className="mt-0.5 text-sm">{profile.bio}</p>}
          <p className="mt-1 text-xs font-bold text-muted">Speler sinds {since}</p>
          {ach.titles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ach.titles.map((t) => (
                <span key={t} className="chip bg-yellow">
                  👑 {t}
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
