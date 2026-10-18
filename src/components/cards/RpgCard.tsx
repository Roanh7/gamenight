import type { CardView } from "@/lib/cardStyles";
import type { EditionId } from "@/lib/player";
import { PixelEmoji } from "./PixelEmoji";
import { editionLabel, em, fit, ovrText, star } from "./shared";

const WIN: Record<EditionId, string> = {
  standard: "linear-gradient(#2849c8,#11206e)",
  gold: "linear-gradient(#c8952a,#5a3a06)",
  rivalry: "linear-gradient(#c8283a,#5a0614)",
  legend: "linear-gradient(#8a5ae0,#2a1060)",
  underdog: "linear-gradient(#22a04b,#0a4420)",
  undefeated: "linear-gradient(#12a3a0,#06403f)",
};

export function RpgCard({ c }: { c: CardView }) {
  const s = c.stats;
  const box = {
    background: WIN[c.edition],
    border: `${em(0.2)} solid #fff`,
    outline: `${em(0.14)} solid #000`,
    borderRadius: em(0.4),
    padding: em(0.55),
  };
  const hearts = Math.round(((s.formPct ?? 0) / 100) * 5);
  const line = { fontSize: em(0.5), lineHeight: 2 };
  const k = { color: "#ffd84a" };
  return (
    <div
      className="pixel relative flex h-full w-full flex-col text-white"
      style={{ background: "#000", border: `${em(0.18)} solid #1e1b2b`, padding: em(0.55), gap: em(0.45) }}
    >
      <div style={box}>
        <div className="flex items-center" style={{ gap: em(0.5) }}>
          <span className="block shrink-0" style={{ width: em(4.4), height: em(4.4), background: "#0b1550", border: `${em(0.1)} solid #fff`, padding: em(0.15) }}>
            <PixelEmoji emoji={c.emoji} letter={c.name.slice(0, 1)} color={c.color} className="block h-full w-full" />
          </span>
          <div className="min-w-0" style={{ lineHeight: 1.9 }}>
            <p className="truncate uppercase" style={{ fontSize: em(fit(c.name, 0.6, 8)) }}>
              {c.name}
            </p>
            <p style={{ fontSize: em(0.52), color: "#ffd84a" }}>LV {c.level}</p>
            <p className="truncate" style={{ fontSize: em(0.36) }}>
              {c.nickname}
            </p>
          </div>
        </div>
        <div className="flex items-center" style={{ fontSize: em(0.46), gap: em(0.4), marginTop: em(0.5 / 0.46) }}>
          <span>OVR{star(c)}</span>
          <span className="relative flex-1" style={{ height: em(0.9), border: `${em(0.18)} solid #fff`, background: "#000" }}>
            <span className="absolute inset-y-0 left-0" style={{ width: `${s.ovr ?? 0}%`, background: "#3ce36b" }} />
          </span>
          <span>{ovrText(c)}</span>
        </div>
      </div>

      <div style={box}>
        <p style={line}>
          <span style={k}>WIN&nbsp;&nbsp;</span> {s.winPct}%
        </p>
        <p style={line}>
          <span style={k}>POS&nbsp;&nbsp;</span> {s.avgPos ?? "-"}
        </p>
        <p style={line}>
          <span style={k}>GAMES</span> {s.games}
        </p>
        <p style={line}>
          <span style={k}>STRK&nbsp;</span> {s.streak}
        </p>
        <p style={line}>
          <span style={k}>ITEMS</span> {s.trophies ? "🏆".repeat(Math.min(s.trophies, 4)) + (s.trophies > 4 ? `+${s.trophies - 4}` : "") : "-"}
        </p>
      </div>

      <div style={box}>
        <p style={line}>
          <span className="rpg-cursor">▶</span> FORM <span style={{ color: "#ff5a6e" }}>{"♥".repeat(hearts)}</span>
          <span style={{ opacity: 0.4 }}>{"♥".repeat(5 - hearts)}</span>
        </p>
        <p style={line}>&nbsp;&nbsp;{editionLabel(c)}</p>
      </div>

      <p className="rpg-cursor mt-auto text-center" style={{ fontSize: em(0.36), color: "#9aa3c7", paddingBottom: em(0.2) }}>
        PRESS START
      </p>
    </div>
  );
}
