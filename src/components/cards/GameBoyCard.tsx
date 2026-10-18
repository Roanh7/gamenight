import type { CardView } from "@/lib/cardStyles";
import type { EditionId } from "@/lib/player";
import { PixelEmoji } from "./PixelEmoji";
import { editionLabel, em, fit, ovrText, star } from "./shared";

const BODY: Record<EditionId, { body: string; shade: string; logo: string }> = {
  standard: { body: "#b9bac4", shade: "#8f909c", logo: "#2b2b8c" },
  gold: { body: "#f2c230", shade: "#c99a12", logo: "#5a3a06" },
  rivalry: { body: "#d8283e", shade: "#a0172a", logo: "#ffffff" },
  legend: { body: "#9a72e0", shade: "#6d48b3", logo: "#ffffff" },
  underdog: { body: "#3fa45b", shade: "#2b7a42", logo: "#ffffff" },
  undefeated: { body: "#2f5de0", shade: "#1f3fa3", logo: "#ffffff" },
};
const DARK = "#0f380f";
const LIGHT = "#9bbc0f";
const MID = "#8bac0f";

function Bar({ pct }: { pct: number }) {
  const on = Math.round((pct / 100) * 8);
  return (
    <span className="flex" style={{ gap: em(0.1), marginTop: em(0.15) }}>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          style={{ width: em(0.42), height: em(0.4), background: i < on ? DARK : MID, outline: i < on ? "none" : `${em(0.05)} solid #306230` }}
        />
      ))}
    </span>
  );
}

export function GameBoyCard({ c }: { c: CardView }) {
  const b = BODY[c.edition];
  const s = c.stats;
  const small = { fontSize: em(0.46), lineHeight: 1.6 };
  return (
    <div
      className="pixel relative h-full w-full"
      style={{
        background: b.body,
        border: `${em(0.18)} solid #1e1b2b`,
        borderRadius: `${em(0.6)} ${em(0.6)} ${em(2.2)} ${em(0.6)}`,
        boxShadow: `inset 0 -${em(0.3)} 0 ${b.shade}`,
        padding: `${em(0.85)} ${em(0.85)} 0`,
      }}
    >
      <div style={{ background: "#4a4b57", borderRadius: `${em(0.4)} ${em(0.4)} ${em(1.3)} ${em(0.4)}`, padding: `${em(0.5)} ${em(0.75)} ${em(0.8)}` }}>
        <p className="flex items-center" style={{ fontSize: em(0.3), color: "#b8b9c6", gap: em(0.3), marginBottom: em(0.4) }}>
          <span style={{ width: em(0.35), height: em(0.35), borderRadius: 99, background: "#e4002b", display: "inline-block" }} />
          DOT MATRIX
        </p>
        <div className="relative" style={{ background: LIGHT, color: DARK, padding: em(0.5), height: em(13.4) }}>
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: em(1.9), lineHeight: 1 }}>{ovrText(c)}</p>
              <p style={{ ...small, marginTop: em(0.35) }}>OVR{star(c)}</p>
              <p style={{ ...small, marginTop: em(0.5) }}>LV {c.level}</p>
            </div>
            <span className="block" style={{ width: em(5.6), height: em(5.6) }}>
              <PixelEmoji emoji={c.emoji} letter={c.name.slice(0, 1)} color={c.color} gameboy className="block h-full w-full" />
            </span>
          </div>
          <p
            className="truncate text-center uppercase"
            style={{ background: DARK, color: LIGHT, fontSize: em(fit(c.name, 0.72)), margin: `${em(0.35)} -${em(0.5)}`, padding: `${em(0.3)} ${em(0.3)}` }}
          >
            {c.name}
          </p>
          <div className="flex justify-between" style={small}>
            <div>
              WIN
              <Bar pct={s.winPct} />
            </div>
            <div>
              FORM
              <Bar pct={s.formPct ?? 0} />
            </div>
          </div>
          <div className="flex justify-between" style={{ ...small, marginTop: em(0.35) }}>
            <span>GMS {s.games}</span>
            <span>STK {s.streak}</span>
          </div>
          <div className="flex justify-between" style={small}>
            <span>WIN {s.winPct}%</span>
            <span>TRO {s.trophies}</span>
          </div>
          <p className="absolute inset-x-0 text-center" style={{ bottom: em(0.4), fontSize: em(0.36) }}>
            {editionLabel(c)}
          </p>
        </div>
      </div>
      <p className="font-sans italic" style={{ fontWeight: 800, color: b.logo, fontSize: em(0.72), margin: `${em(0.45)} 0 0 ${em(4.6)}` }}>
        Game Night
      </p>
      <span className="absolute" style={{ left: em(1.4), bottom: em(1.6), width: em(2.2), height: em(2.2) }} aria-hidden>
        <span className="absolute" style={{ left: em(0.75), top: 0, width: em(0.7), height: em(2.2), background: "#1e1b2b", borderRadius: em(0.12) }} />
        <span className="absolute" style={{ top: em(0.75), left: 0, width: em(2.2), height: em(0.7), background: "#1e1b2b", borderRadius: em(0.12) }} />
      </span>
      <span className="absolute flex" style={{ right: em(1.3), bottom: em(1.5), gap: em(0.45), transform: "rotate(-25deg)" }} aria-hidden>
        {[0, 1].map((i) => (
          <span key={i} style={{ width: em(1.15), height: em(1.15), borderRadius: 99, background: "#a3214d", border: `${em(0.12)} solid #1e1b2b` }} />
        ))}
      </span>
    </div>
  );
}
