import type { CardStats, EditionId } from "@/lib/player";
import { EDITIONS } from "@/lib/player";
import { BG, TEXT_ON, safeColor } from "@/lib/colors";
import { seasonLabel } from "@/lib/stats";

/** Kleuren per editie (eigen Game Night-stijl). */
export const EDITION_STYLE: Record<EditionId, { bg: string; text: string; accent: string; shine?: boolean }> = {
  standard: { bg: "linear-gradient(160deg,#f4efe3 0%,#d9d1bf 55%,#bdb4a0 100%)", text: "#1e1b2b", accent: "#6e6879" },
  gold: { bg: "linear-gradient(160deg,#fff1b8 0%,#ffc527 45%,#c98a00 100%)", text: "#1e1b2b", accent: "#7a4e00", shine: true },
  rivalry: { bg: "linear-gradient(160deg,#ff5a6e 0%,#e4002b 45%,#3a0010 100%)", text: "#ffffff", accent: "#ffd0d7" },
  legend: { bg: "linear-gradient(160deg,#c9a7ff 0%,#7b4fd6 40%,#12a3a0 100%)", text: "#ffffff", accent: "#e8dcff", shine: true },
  underdog: { bg: "linear-gradient(160deg,#7fe09c 0%,#22a04b 45%,#0b4d22 100%)", text: "#ffffff", accent: "#d3f7de" },
  undefeated: { bg: "linear-gradient(160deg,#8fb0ff 0%,#2f5de0 45%,#0f1f6b 100%)", text: "#ffffff", accent: "#dbe5ff" },
};

const SIZES = {
  sm: { w: "w-[132px]", ovr: "text-[18px]", name: "text-[9px]", avatar: "h-14 w-14 text-[30px]", stat: "text-[10px]", label: "text-[7px]", pad: "p-2" },
  md: { w: "w-[176px]", ovr: "text-[24px]", name: "text-[11px]", avatar: "h-[72px] w-[72px] text-[40px]", stat: "text-[12px]", label: "text-[8px]", pad: "p-2.5" },
  lg: { w: "w-[230px]", ovr: "text-[32px]", name: "text-[13px]", avatar: "h-24 w-24 text-[54px]", stat: "text-[15px]", label: "text-[9px]", pad: "p-3.5" },
};

export function PlayerCard({
  name,
  color,
  emoji,
  nickname,
  edition,
  stats,
  season,
  size = "md",
  locked,
}: {
  name: string;
  color?: string | null;
  emoji?: string | null;
  nickname: string;
  edition: EditionId;
  stats: CardStats;
  season?: string | null;
  size?: keyof typeof SIZES;
  locked?: boolean;
}) {
  const st = EDITION_STYLE[edition];
  const s = SIZES[size];
  const c = safeColor(color);
  return (
    <div
      className={`player-card relative ${s.w} ${locked ? "opacity-40 grayscale" : ""}`}
      style={{ background: st.bg, color: st.text }}
    >
      {st.shine && !locked && <span className="player-card-shine" aria-hidden />}
      <div className={`relative flex flex-col ${s.pad}`}>
        <div className="flex items-start justify-between">
          <div className="leading-none">
            <p className={`pixel ${s.ovr} leading-none`}>{stats.ovr ?? "--"}</p>
            <p className={`pixel mt-1 ${s.label}`} style={{ color: st.accent }}>
              OVR
            </p>
            {stats.provisional && stats.ovr !== null && (
              <p className={`mt-1 font-black uppercase ${s.label}`} style={{ color: st.accent }}>
                voorlopig
              </p>
            )}
          </div>
          <p className={`pixel max-w-[60%] text-right uppercase leading-tight ${s.label}`} style={{ color: st.accent }}>
            {season ? seasonLabel(season) : EDITIONS[edition].name}
          </p>
        </div>

        <div className="mt-1 flex justify-center">
          <span
            className={`${s.avatar} ${BG[c]} ${TEXT_ON[c]} pixel-avatar flex items-center justify-center leading-none`}
            aria-hidden
          >
            {emoji ?? <span className="pixel text-[0.55em] uppercase">{name.slice(0, 1)}</span>}
          </span>
        </div>

        <p className={`pixel mt-2 truncate text-center uppercase ${s.name}`}>{name}</p>
        <p className={`truncate text-center font-black uppercase tracking-wide ${s.label}`} style={{ color: st.accent }}>
          {nickname}
        </p>

        <div className="my-1.5 h-[2px] w-full" style={{ background: st.accent, opacity: 0.5 }} />

        <dl className={`grid gap-x-1 gap-y-1 text-center ${size === "lg" ? "grid-cols-4" : "grid-cols-2"}`}>
          {(
            [
              [`${stats.winPct}%`, "WIN"],
              [stats.games, "GAMES"],
              [stats.streak, "STREAK"],
              [stats.trophies, size === "lg" ? "TROPH." : "TROPHIES"],
            ] as const
          ).map(([v, l]) => (
            <div key={l}>
              <dd className={`pixel ${s.stat} leading-tight`}>{v}</dd>
              <dt className={`font-black ${s.label}`} style={{ color: st.accent }}>
                {l}
              </dt>
            </div>
          ))}
        </dl>

        <p className={`mt-1.5 text-center font-black uppercase tracking-wider ${s.label}`} style={{ color: st.accent }}>
          Game Night · {EDITIONS[edition].name}
        </p>
      </div>
      {locked && (
        <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-label="nog niet vrijgespeeld">
          🔒
        </span>
      )}
    </div>
  );
}
