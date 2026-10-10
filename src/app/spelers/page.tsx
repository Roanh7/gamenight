import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles, getResults } from "@/lib/data";
import { currentBountyTarget, currentSeason, filterSeason, seasonChampions, seasonLabel, standings } from "@/lib/stats";
import { Avatar } from "@/components/Avatar";
import { EmptyState, PageHeader } from "@/components/ui";
import { SOFT_BG, safeColor } from "@/lib/colors";
import { computeXp, getAttendance } from "@/lib/xp";

export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [profiles, results, attendance] = await Promise.all([
    getProfiles(supabase),
    getResults(supabase),
    getAttendance(supabase),
  ]);
  const xpOf = computeXp(results, attendance);
  const target = currentBountyTarget(results);

  const season = currentSeason();
  const seasonRows = standings(filterSeason(results, season));
  const allTime = standings(results);
  const champs = seasonChampions(results);
  const titlesOf = (id: string) => [...champs.values()].filter((u) => u === id).length;

  const players = [...profiles.list].sort((a, b) => {
    const ra = seasonRows.find((s) => s.user_id === a.id)?.rank ?? 999;
    const rb = seasonRows.find((s) => s.user_id === b.id)?.rank ?? 999;
    return ra - rb || a.username.localeCompare(b.username);
  });

  return (
    <div>
      <PageHeader kicker="PLAYERS" title={`${players.length} spelers`} />
      <p className="-mt-3 mb-4 text-sm font-bold text-muted">Tik op een speler voor zijn profiel. Volgorde: stand van seizoen {seasonLabel(season)}.</p>

      {players.length ? (
        <section className="select-screen rounded-2xl border-2 border-line px-3 pb-4 pt-3 shadow-[0_4px_0_var(--color-line)]">
          <p className="pixel mb-3 text-center text-[11px] text-yellow">
            CHOOSE YOUR PLAYER <span className="blink">▶</span>
          </p>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 [&>li]:min-w-0">
            {players.map((p) => {
              const s = seasonRows.find((x) => x.user_id === p.id);
              const a = allTime.find((x) => x.user_id === p.id);
              const titles = titlesOf(p.id);
              const isMe = p.id === me?.user.id;
              const color = safeColor(p.avatar_color);
              return (
                <li key={p.id} className="flex">
                  <Link
                    href={isMe ? "/account" : `/spelers/${p.username}`}
                    className={`relative flex w-full flex-col items-center px-2 pb-2.5 pt-3 text-center transition-transform active:translate-y-[2px] ${SOFT_BG[color]} ${isMe ? "pixel-frame-me" : "pixel-frame"}`}
                  >
                    <span className="pixel absolute left-1.5 top-1.5 text-[9px] text-ink/70">
                      {s ? `#${s.rank}` : "–"}
                    </span>
                    {isMe && (
                      <span className="pixel absolute right-1 top-1 bg-red px-1 text-[8px] leading-[14px] text-white">1P</span>
                    )}
                    <span className={isMe || s?.rank === 1 ? "animate-bob" : ""}>
                      <Avatar
                        name={p.username}
                        color={p.avatar_color}
                        url={p.avatar_url}
                        emoji={p.avatar_emoji}
                        size="xl"
                        crown={s?.rank === 1}
                      />
                    </span>
                    <span className="pixel mt-2.5 block w-full truncate text-[10px] uppercase">{p.username}</span>
                    <span className="pixel mt-1 text-[8px] text-ink/70">
                      LV {xpOf(p.id).level} · {xpOf(p.id).title.toUpperCase()}
                    </span>
                    {p.bio && <span className="mt-1 line-clamp-1 text-[11px] font-bold text-ink/70">{p.bio}</span>}
                    <span className="mt-2 grid w-full grid-cols-2 gap-1 text-[10px] font-black">
                      <span className="rounded bg-paper/80 px-1 py-0.5">
                        <span className="pixel block text-[9px]">{s ? s.points : 0}</span>PT
                      </span>
                      <span className="rounded bg-paper/80 px-1 py-0.5">
                        <span className="pixel block text-[9px]">{a ? a.wins : 0}</span>
                        {a?.wins === 1 ? "ZEGE" : "ZEGES"}
                      </span>
                    </span>
                    {titles > 0 && <span className="mt-1 text-xs">{"🏆".repeat(Math.min(titles, 3))}</span>}
                    {p.id === target && (
                      <span className="pixel mt-1.5 bg-red px-1.5 py-0.5 text-[8px] text-white">🎯 PREMIE +10 XP</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <EmptyState icon={<Users size={32} />} title="Nog geen spelers" />
      )}
    </div>
  );
}
