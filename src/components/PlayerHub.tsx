import Link from "next/link";
import type { Profile } from "@/lib/types";
import type { XpInfo } from "@/lib/xp";
import type { FormLetter } from "@/lib/player";
import { nextReward } from "@/lib/player";
import { BG, TEXT_ON, safeColor } from "@/lib/colors";
import { Avatar } from "./Avatar";

const HEX: Record<string, string> = {
  red: "#e4002b",
  blue: "#2f5de0",
  green: "#22a04b",
  yellow: "#ffc527",
  purple: "#7b4fd6",
  orange: "#f5761a",
  pink: "#e6489b",
  teal: "#12a3a0",
};

/** Het "hoofdmenu" van de app: je speler, je voortgang, je vorm en je rivaal. */
export function PlayerHub({
  me,
  welcome,
  xp,
  ovr,
  provisional,
  rank,
  wins,
  streak,
  form,
  rival,
  leader,
  isChampion,
}: {
  me: Profile;
  welcome: boolean;
  xp: XpInfo;
  ovr: number | null;
  provisional: boolean;
  rank: number | null;
  wins: number;
  streak: number;
  form: FormLetter[];
  rival: { profile: Profile; wins: number; losses: number } | null;
  leader: { profile: Profile; isMe: boolean } | null;
  isChampion: boolean;
}) {
  const c = safeColor(me.avatar_color);
  const reward = nextReward(xp.level);
  const banner = xp.level >= 7 ? "hub-banner-neon" : xp.level >= 3 ? "bg-red hub-banner-pixel" : "bg-red";
  const avatarFx = [
    xp.level >= 5 || isChampion ? "ring" : "",
    xp.level >= 10 ? "glow" : "",
    isChampion ? "gold" : "",
  ].join(" ");
  const formWins = form.filter((f) => f === "W").length;
  const pct = Math.round((xp.into / xp.span) * 100);

  return (
    <section className="card overflow-hidden">
      {/* Banner met speler */}
      <div className={`${banner} relative border-b-2 border-line px-4 pb-4 pt-3 text-white`}>
        <div className="flex items-center justify-between">
          <p className="pixel text-[10px]">PLAYER HUB</p>
          {ovr !== null && (
            <Link href="/kaarten" className="pixel rounded-md border-2 border-line bg-yellow px-1.5 py-1 text-[10px] text-night">
              {ovr} OVR{provisional ? "*" : ""}
            </Link>
          )}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <span
            className={`hub-avatar ${avatarFx} ${BG[c]} ${TEXT_ON[c]} flex h-24 w-24 shrink-0 items-center justify-center text-[54px] leading-none`}
            style={{ ["--hub-ring" as string]: HEX[c] }}
            aria-hidden
          >
            {me.avatar_emoji ?? <span className="pixel text-3xl uppercase">{me.username.slice(0, 1)}</span>}
          </span>
          <div className="min-w-0">
            <p className="pixel text-[9px] opacity-90">{welcome ? "NEW PLAYER JOINED!" : "WELCOME BACK, PLAYER 1"}</p>
            <h1 className="mt-1 truncate text-3xl font-black leading-none">{me.username}</h1>
            <p className="pixel mt-2 text-[10px]">
              LVL {xp.level} · {xp.title.toUpperCase()}
            </p>
            {isChampion && <p className="mt-1 text-xs font-black">🏆 Seizoenskampioen</p>}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Level */}
        <div>
          <div className="flex items-baseline justify-between">
            <span className="pixel text-[9px] text-muted">LEVEL PROGRESS</span>
            <span className="text-xs font-black">
              {xp.into} / {xp.span} XP
            </span>
          </div>
          <div className="mt-1.5 h-4 overflow-hidden rounded-md border-2 border-line bg-soft">
            <div className="h-full bg-green" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-muted">
            <b className="text-ink">{xp.toNext} XP te gaan</b> tot level {xp.level + 1}
            {reward && (
              <>
                {" "}
                · Volgende beloning (LV {reward.level}): <b className="text-ink">{reward.name}</b>
              </>
            )}
          </p>
        </div>

        {/* Kerncijfers */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {(
            [
              [rank ? `#${rank}` : "–", "Ranking"],
              [wins, "Zeges"],
              [`🔥 ${streak}`, "Winstreeks"],
            ] as const
          ).map(([v, l]) => (
            <div key={l} className="rounded-xl border-2 border-line bg-cream py-2">
              <p className="pixel text-sm">{v}</p>
              <p className="text-[10px] font-black uppercase text-muted">{l}</p>
            </div>
          ))}
        </div>

        {/* Vorm */}
        <div>
          <p className="pixel mb-1.5 text-[9px] text-muted">LAATSTE {form.length || 5} POTJES</p>
          {form.length ? (
            <div className="flex items-center gap-1.5">
              {form.map((f, i) => (
                <span
                  key={i}
                  className={`pixel flex h-8 w-8 items-center justify-center rounded-md border-2 border-line text-[11px] ${
                    f === "W" ? "bg-green text-white" : f === "D" ? "bg-soft" : "bg-red text-white"
                  }`}
                  title={f === "W" ? "Gewonnen" : f === "D" ? "Gedeelde 1e plek" : "Verloren"}
                >
                  {f}
                </span>
              ))}
              <span className="ml-1 text-xs font-bold text-muted">
                {formWins} van de laatste {form.length} gewonnen
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted">Nog geen potjes gespeeld.</p>
          )}
        </div>

        {/* Rivaal en koploper */}
        <div className="grid grid-cols-2 gap-2">
          {rival ? (
            <Link href={`/spelers/${rival.profile.username}`} className="rounded-xl border-2 border-line bg-red-soft p-2.5">
              <p className="pixel text-[8px]">⚔️ JOUW RIVAAL</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar
                  name={rival.profile.username}
                  color={rival.profile.avatar_color}
                  emoji={rival.profile.avatar_emoji}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{rival.profile.username}</p>
                  <p className="text-[11px] font-bold text-muted">
                    Onderling {rival.wins}–{rival.losses}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-line/40 p-2.5">
              <p className="pixel text-[8px]">⚔️ JOUW RIVAAL</p>
              <p className="mt-1.5 text-xs text-muted">Speel minstens 3 potjes tegen iemand.</p>
            </div>
          )}
          {leader ? (
            <Link href="/ranking" className="rounded-xl border-2 border-line bg-yellow-soft p-2.5">
              <p className="pixel text-[8px]">🎯 KOPLOPER</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar
                  name={leader.profile.username}
                  color={leader.profile.avatar_color}
                  emoji={leader.profile.avatar_emoji}
                  size="sm"
                  crown
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{leader.isMe ? "Jij!" : leader.profile.username}</p>
                  <p className="text-[11px] font-bold text-muted">
                    {leader.isMe ? "Premie op jouw hoofd" : "Versla hem: +10 XP"}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-line/40 p-2.5">
              <p className="pixel text-[8px]">🎯 KOPLOPER</p>
              <p className="mt-1.5 text-xs text-muted">Nog niemand alleen bovenaan.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/kaarten" className="btn btn-yellow btn-sm">
            🃏 Mijn Player Card
          </Link>
          <Link href="/ranking" className="btn btn-secondary btn-sm">
            🏆 Ranking
          </Link>
        </div>
      </div>
    </section>
  );
}
