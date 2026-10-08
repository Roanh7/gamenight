import Link from "next/link";
import { CalendarPlus, Crown, Gamepad2, PartyPopper, Trophy, TrendingUp, Handshake } from "lucide-react";
import type { Activity, Game, GameNight, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";

type Props = {
  items: Activity[];
  profiles: Map<string, Profile>;
  games: Map<string, Game>;
  nights: Map<string, Pick<GameNight, "id" | "title">>;
};

export function ActivityFeed({ items, profiles, games, nights }: Props) {
  return (
    <ul className="card divide-y-2 divide-soft overflow-hidden">
      {items.map((a) => {
        const actor = a.actor_id ? profiles.get(a.actor_id) : undefined;
        const game = a.game_id ? games.get(a.game_id) : undefined;
        const night = a.night_id ? nights.get(a.night_id) : undefined;
        const name = <b className="font-black">{actor?.username ?? "Iemand"}</b>;
        const gameLink = game ? (
          <Link href={`/games/${game.id}`} className="font-black underline decoration-2 underline-offset-2">
            {game.name}
          </Link>
        ) : (
          <b>een game</b>
        );

        let icon = <PartyPopper size={16} />;
        let tone = "bg-blue-soft";
        let text: React.ReactNode = null;

        switch (a.type) {
          case "member_joined":
            icon = <PartyPopper size={16} />;
            tone = "bg-pink-soft";
            text = <>{name} doet nu mee. Welkom!</>;
            break;
          case "game_added":
            icon = <Gamepad2 size={16} />;
            tone = "bg-purple-soft";
            text = <>{name} heeft {gameLink} toegevoegd</>;
            break;
          case "night_planned":
            icon = <CalendarPlus size={16} />;
            tone = "bg-blue-soft";
            text = (
              <>
                {name} plande{" "}
                {night ? (
                  <Link href={`/agenda/${night.id}`} className="font-black underline decoration-2 underline-offset-2">
                    {night.title}
                  </Link>
                ) : (
                  "een gamenight"
                )}
              </>
            );
            break;
          case "match_finished":
            if (a.payload?.team) {
              const names = ((a.payload.winners as string[]) ?? [])
                .map((id) => profiles.get(id)?.username)
                .filter(Boolean)
                .join(" & ");
              icon = <Trophy size={16} />;
              tone = "bg-yellow-soft";
              text = (
                <>
                  <b className="font-black">{names || "Het team"}</b> wonnen {gameLink} samen
                </>
              );
            } else if (a.payload?.draw) {
              icon = <Handshake size={16} />;
              tone = "bg-soft";
              text = <>Gelijkspel bij {gameLink}. Geen winnaar!</>;
            } else {
              icon = <Trophy size={16} />;
              tone = "bg-yellow-soft";
              text = <>{name} won {gameLink}</>;
            }
            break;
          case "rank_up": {
            const nr = Number(a.payload?.new_rank);
            const old = a.payload?.old_rank ? Number(a.payload.old_rank) : null;
            if (nr === 1) {
              icon = <Crown size={16} />;
              tone = "bg-yellow";
              text = <>{name} staat nu <b>#1</b> in {gameLink}</>;
            } else {
              icon = <TrendingUp size={16} />;
              tone = "bg-green-soft";
              text = (
                <>
                  {name} stijgt naar <b>#{nr}</b> in {gameLink}
                  {old ? <span className="text-muted"> (was #{old})</span> : null}
                </>
              );
            }
            break;
          }
          default:
            text = <>Er gebeurde iets</>;
        }

        return (
          <li key={a.id} className="flex items-start gap-3 px-4 py-3">
            <div className="relative">
              {actor ? (
                <Avatar name={actor.username} color={actor.avatar_color} size="sm" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-line bg-soft">
                  {icon}
                </span>
              )}
              {actor && (
                <span
                  className={`absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-md border-2 border-line ${tone}`}
                >
                  {icon && <span className="scale-75">{icon}</span>}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{text}</p>
              <p className="mt-0.5 text-xs text-muted">{timeAgo(a.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
