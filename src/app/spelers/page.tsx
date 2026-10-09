import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Users } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles, getResults } from "@/lib/data";
import { currentSeason, filterSeason, seasonChampions, seasonLabel, standings } from "@/lib/stats";
import { Avatar } from "@/components/Avatar";
import { EmptyState, PageHeader, RankBadge } from "@/components/ui";

export const metadata: Metadata = { title: "Players" };

export default async function PlayersPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [profiles, results] = await Promise.all([getProfiles(supabase), getResults(supabase)]);

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
      <p className="-mt-3 mb-4 text-sm font-bold text-muted">Gesorteerd op de stand van seizoen {seasonLabel(season)}.</p>

      {players.length ? (
        <ul className="grid gap-2.5">
          {players.map((p) => {
            const s = seasonRows.find((x) => x.user_id === p.id);
            const a = allTime.find((x) => x.user_id === p.id);
            const titles = titlesOf(p.id);
            const isMe = p.id === me?.user.id;
            return (
              <li key={p.id}>
                <Link
                  href={isMe ? "/account" : `/spelers/${p.username}`}
                  className={`card flex items-center gap-3 p-3 transition-transform active:translate-y-[2px] ${isMe ? "bg-yellow-soft" : ""}`}
                >
                  {s ? (
                    <RankBadge rank={s.rank} />
                  ) : (
                    <span className="pixel flex h-8 w-8 shrink-0 items-center justify-center text-[11px] text-muted">–</span>
                  )}
                  <Avatar name={p.username} color={p.avatar_color} size="md" crown={s?.rank === 1} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black">
                      {p.username}
                      {isMe && <span className="ml-1 text-xs font-bold text-muted">(jij)</span>}
                      {titles > 0 && <span className="ml-1 text-xs">{"🏆".repeat(Math.min(titles, 3))}</span>}
                    </p>
                    <p className="truncate text-xs font-bold text-muted">
                      {p.bio ? `${p.bio} · ` : ""}
                      {a ? `${a.wins} ${a.wins === 1 ? "zege" : "zeges"} · ${a.played} gespeeld` : "Nog niet gespeeld"}
                    </p>
                  </div>
                  {s && (
                    <span className="text-right">
                      <span className="pixel text-[12px]">{s.points}</span>
                      <span className="ml-1 text-[10px] font-black text-muted">PT</span>
                    </span>
                  )}
                  <ChevronRight size={18} className="shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Users size={32} />} title="Nog geen spelers" />
      )}
    </div>
  );
}
