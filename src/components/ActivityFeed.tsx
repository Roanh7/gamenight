import Link from "next/link";
import { CalendarPlus, Crown, Flag, Gamepad2, PartyPopper, Shield, Trophy, TrendingUp, Handshake } from "lucide-react";
import type { Activity, Game, GameNight, Profile } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { Reactions } from "./Reactions";
import { Comments } from "./Comments";
import type { CommentRow } from "@/lib/comments";
import { bannerDef, type Rarity } from "@/lib/banners";
import { Banner } from "./Banner";
import { seasonLabel } from "@/lib/stats";
import { newsKind } from "@/lib/news";

type Props = {
  items: Activity[];
  profiles: Map<string, Profile>;
  games: Map<string, Game>;
  nights: Map<string, Pick<GameNight, "id" | "title">>;
  me?: { id: string; name: string };
  reactions?: Map<number, Record<string, { n: number; mine: boolean; names: string[] }>>;
  comments?: Map<number, { count: number; latest: CommentRow[] }>;
  /** Compacte kaartjes (Home): geen reacties/comments, met een link naar het volledige bericht */
  compact?: boolean;
};

type RecapStat = { user_id: string; points: number; wins: number; played: number; last: number };

export function ActivityFeed({ items, profiles, games, nights, me, reactions, comments, compact }: Props) {
  return (
    <ul className={compact ? "feed-compact divide-y-2 divide-soft" : "card divide-y-2 divide-soft overflow-hidden"}>
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
              const teamName = a.payload.team_name ? String(a.payload.team_name) : null;
              text = teamName ? (
                <>
                  <b className="font-black">{teamName}</b> wint {gameLink}
                  {names ? <span className="text-muted"> ({names})</span> : null}
                </>
              ) : (
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
          case "host_changed":
            icon = <Shield size={16} />;
            tone = "bg-yellow-soft";
            text = (
              <>
                {name} is nu host van{" "}
                {night ? (
                  <Link href={`/agenda/${night.id}`} className="font-black underline decoration-2 underline-offset-2">
                    {night.title}
                  </Link>
                ) : (
                  "de avond"
                )}
              </>
            );
            break;
          case "night_recap": {
            icon = <Flag size={16} />;
            tone = "bg-red-soft";
            const stats = ((a.payload?.stats as RecapStat[]) ?? []).slice(0, 3);
            const mvp = a.payload?.mvp ? profiles.get(String(a.payload.mvp)) : undefined;
            const title = night?.title ?? String(a.payload?.title ?? "de avond");
            text = (
              <>
                <b className="font-black">🏁 Recap: </b>
                {a.night_id ? (
                  <Link href={`/agenda/${a.night_id}#recap`} className="font-black underline decoration-2 underline-offset-2">
                    {title}
                  </Link>
                ) : (
                  title
                )}
                <br />
                {mvp ? (
                  <>
                    MVP <b className="font-black">{mvp.username}</b> met {stats[0]?.points ?? 0} pt
                  </>
                ) : (
                  <>Gedeelde eerste plek, geen MVP</>
                )}{" "}
                · {String(a.payload?.matches ?? 0)} potjes
                <span className="feed-extra mt-1.5 flex items-end gap-1.5">
                  {stats.map((s, i) => {
                    const p = profiles.get(s.user_id);
                    return p ? (
                      <span key={s.user_id} className="inline-flex items-center gap-1 rounded-full bg-cream py-0.5 pl-0.5 pr-2 text-xs font-black">
                        <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size="xs" />
                        {["🥇", "🥈", "🥉"][i]} {s.points}
                      </span>
                    ) : null;
                  })}
                </span>
              </>
            );
            break;
          }
          case "history_correction": {
            const action = String(a.payload?.action ?? "");
            const seasons = ((a.payload?.seasons as string[] | undefined) ?? [String(a.payload?.season ?? "")])
              .filter(Boolean)
              .map(seasonLabel)
              .join(", ");
            const title = String(a.payload?.title ?? "een avond");
            icon = <span className="text-sm leading-none">📜</span>;
            tone = "bg-yellow-soft";
            text = (
              <>
                <b className="pixel text-[9px]">📜 SEIZOENSCORRECTIE {seasons}</b>
                <br />
                {action === "night_removed" ? (
                  <>
                    {name} heeft de avond <b className="font-black">{title}</b> verwijderd ({String(a.payload?.matches ?? 0)}{" "}
                    {Number(a.payload?.matches) === 1 ? "potje" : "potjes"}). De eindstand van {seasons} is bijgewerkt.
                  </>
                ) : action === "match_removed" ? (
                  <>
                    {name} heeft een potje {gameLink} van <b className="font-black">{title}</b> weggegooid. De eindstand van {seasons} is
                    bijgewerkt.
                  </>
                ) : (
                  <>
                    {name} corrigeert een potje {gameLink} van <b className="font-black">{title}</b>. Na opslaan telt het weer mee voor{" "}
                    {seasons}.
                  </>
                )}
              </>
            );
            break;
          }
          case "underdog_win": {
            const bonus = Number(a.payload?.bonus ?? 2);
            const base = Number(a.payload?.base ?? 0);
            icon = <span className="text-sm leading-none">🐺</span>;
            tone = "bg-yellow";
            text = (
              <>
                <b className="pixel text-[9px]">🐺 UNDERDOG VICTORY!</b>
                <br />
                {name} wint {gameLink} tegen alle verwachtingen in:{" "}
                <b className="font-black">
                  +{base} + {bonus} bonus = +{base + bonus} punten
                </b>
                {night ? <span className="text-muted"> · {night.title}</span> : null}
              </>
            );
            break;
          }
          case "banner_unlocked": {
            const def = bannerDef(String(a.payload?.banner ?? ""));
            const rarity = (String(a.payload?.rarity ?? def.rarity)) as Rarity;
            icon = <span className="text-sm leading-none">{def.emoji}</span>;
            tone = rarity === "mythic" || rarity === "legendary" ? "bg-yellow-soft" : "bg-purple-soft";
            text = (
              <>
                <b className="pixel text-[9px]">{rarity === "epic" ? "✨ EPIC UNLOCK!" : rarity === "mythic" ? "🌈 MYTHIC UNLOCK!" : "👑 LEGENDARY UNLOCK!"}</b>
                <br />
                {name} heeft de <b className="font-black">{def.name}</b>-banner vrijgespeeld.
                <span className={`feed-extra rarity-frame r-${rarity} mt-1.5 block h-12`}>
                  <Banner id={def.id} still />
                </span>
              </>
            );
            break;
          }
          default:
            text = <>Er gebeurde iets</>;
        }

        return (
          <li key={a.id} id={compact ? undefined : `a-${a.id}`} className={`flex scroll-mt-20 items-start gap-3 ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
            <div className="relative">
              {actor ? (
                <Avatar name={actor.username} color={actor.avatar_color} url={actor.avatar_url} emoji={actor.avatar_emoji} pixel={actor.avatar_pixel} frame={actor.avatar_frame} size="sm" />
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
              {compact && (
                <p className="pixel mb-0.5 text-[7px] text-muted">
                  {newsKind(a.type).emoji} {newsKind(a.type).label}
                </p>
              )}
              <p className={`text-sm leading-snug ${compact ? "line-clamp-3" : ""}`}>{text}</p>
              {compact ? (
                <p className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted">
                  <span>{timeAgo(a.created_at)}</span>
                  <Link href={`/nieuws#a-${a.id}`} className="shrink-0 font-black text-ink hover:underline" aria-label="Open dit bericht">
                    Open ▶
                  </Link>
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted">{timeAgo(a.created_at)}</p>
              )}
              {me && !compact && (
                <>
                  <Reactions activityId={a.id} userId={me.id} myName={me.name} initial={reactions?.get(a.id) ?? {}} />
                  <Comments
                    activityId={a.id}
                    userId={me.id}
                    myName={me.name}
                    initial={comments?.get(a.id) ?? { count: 0, latest: [] }}
                  />
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
