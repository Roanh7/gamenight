import Link from "next/link";
import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";
import { RankBadge } from "./ui";

export type BoardRow = {
  user_id: string;
  rank: number;
  points: number;
  wins: number;
  played: number;
  extra?: string;
};

export function Leaderboard({
  rows,
  profiles,
  meId,
  limit,
  compact,
}: {
  rows: BoardRow[];
  profiles: Map<string, Profile>;
  meId?: string;
  limit?: number;
  compact?: boolean;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <ol className={compact ? "space-y-1.5" : "card divide-y-2 divide-soft overflow-hidden"}>
      {shown.map((r) => {
        const p = profiles.get(r.user_id);
        if (!p) return null;
        const me = r.user_id === meId;
        return (
          <li key={r.user_id}>
            <Link
              href={`/spelers/${p.username}`}
              className={`flex items-center gap-3 ${compact ? "rounded-xl px-1 py-1" : "px-3 py-2.5"} ${
                me ? "bg-yellow-soft" : ""
              }`}
            >
              <RankBadge rank={r.rank} />
              <Avatar name={p.username} color={p.avatar_color} size="sm" crown={r.rank === 1} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">
                  {p.username}
                  {me && <span className="ml-1 text-xs font-bold text-muted">(jij)</span>}
                </p>
                {!compact && (
                  <p className="text-xs font-bold text-muted">
                    {r.wins} {r.wins === 1 ? "zege" : "zeges"} · {r.played} gespeeld
                    {r.extra ? ` · ${r.extra}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="pixel text-[13px]">{r.points}</span>
                <span className="ml-1 text-[10px] font-black text-muted">PT</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
