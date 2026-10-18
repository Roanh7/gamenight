import type { CardView } from "@/lib/cardStyles";
import type { EditionId } from "@/lib/player";
import { PixelEmoji } from "./PixelEmoji";
import { editionLabel, em, fit, ovrText, star } from "./shared";

const NEON: Record<EditionId, { a: string; b: string; ovr: string; sh: string; rows: string[] }> = {
  standard: { a: "#ff3b6b", b: "#3be8ff", ovr: "#ffd84a", sh: "#e4002b", rows: ["#ffd84a", "#3be8ff", "#ff3b6b", "#3ce36b"] },
  gold: { a: "#ffd84a", b: "#fff1b8", ovr: "#ffd84a", sh: "#b87800", rows: ["#ffd84a", "#ffe58a", "#ffc527", "#fff1b8"] },
  rivalry: { a: "#ff3b3b", b: "#ff8a8a", ovr: "#ff3b3b", sh: "#5a0614", rows: ["#ff3b3b", "#ff8a8a", "#ff5a6e", "#ffd0d7"] },
  legend: { a: "#c9a7ff", b: "#3be8ff", ovr: "#ff6bd6", sh: "#3b1d7a", rows: ["#ff6bd6", "#c9a7ff", "#3be8ff", "#6bffb0"] },
  underdog: { a: "#3ce36b", b: "#b8ffcb", ovr: "#3ce36b", sh: "#0a4420", rows: ["#3ce36b", "#b8ffcb", "#7fe09c", "#d3f7de"] },
  undefeated: { a: "#3be8ff", b: "#8fb0ff", ovr: "#3be8ff", sh: "#0c1a5c", rows: ["#3be8ff", "#8fb0ff", "#dbe5ff", "#6bc8ff"] },
};

export function ArcadeCard({ c }: { c: CardView }) {
  const n = NEON[c.edition];
  const s = c.stats;
  const glow = (col: string) => `0 0 ${em(0.4)} ${col}`;
  const rows: [string, string | number][] = [
    ["WIN", `${s.winPct}%`],
    ["GAMES", s.games],
    ["STREAK", s.streak],
    ["TROPHIES", s.trophies],
  ];
  return (
    <div
      className="arcade-card pixel relative flex h-full w-full flex-col items-center overflow-hidden text-center text-white"
      style={{ background: "#07060c", border: `${em(0.18)} solid #1e1b2b`, padding: `${em(0.8)} ${em(0.7)}` }}
    >
      <p style={{ fontSize: em(0.42), color: n.a, textShadow: glow(n.a) }}>PLAYER 1 · LV {c.level}</p>
      <p className="max-w-full truncate uppercase" style={{ fontSize: em(fit(c.name, 0.66, 10)), color: n.b, textShadow: glow(n.b), marginTop: em(0.5) }}>
        {c.name}
      </p>
      <span className="block" style={{ width: em(5.2), height: em(5.2), marginTop: em(0.6) }}>
        <PixelEmoji emoji={c.emoji} letter={c.name.slice(0, 1)} color={c.color} className="block h-full w-full" />
      </span>
      <p style={{ fontSize: em(0.42), color: n.b, textShadow: glow(n.b), marginTop: em(0.6) }}>HI-SCORE{star(c)}</p>
      <p
        className={c.edition === "legend" ? "arcade-rainbow" : ""}
        style={{ fontSize: em(2.4), lineHeight: 1, color: n.ovr, textShadow: `${em(0.12)} ${em(0.12)} 0 ${n.sh}, ${glow(n.ovr)}`, marginTop: em(0.3) }}
      >
        {ovrText(c)}
      </p>
      <div style={{ width: em(11.5), marginTop: em(0.7) }}>
        {rows.map(([l, v], i) => (
          <p key={l} className="flex justify-between" style={{ fontSize: em(0.5), lineHeight: 2, color: n.rows[i] }}>
            <span>{l}</span>
            <span>{v}</span>
          </p>
        ))}
      </div>
      <p className="arcade-blink" style={{ fontSize: em(0.4), marginTop: em(0.6) }}>
        INSERT COIN
      </p>
      <p className="mt-auto" style={{ fontSize: em(0.34), color: "#8a86a0" }}>
        {editionLabel(c)}
      </p>
    </div>
  );
}
