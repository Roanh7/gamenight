import type { CardView } from "@/lib/cardStyles";
import type { EditionId } from "@/lib/player";
import { PixelEmoji } from "./PixelEmoji";
import { editionLabel, em, fit, ovrText, star } from "./shared";

const INNER: Record<EditionId, { bg: string; sky: string; hill: string; hill2: string; shine?: boolean }> = {
  standard: { bg: "#c9d4e2", sky: "#7fd0ff", hill: "#22a04b", hill2: "#157a35" },
  gold: { bg: "#f7c948", sky: "#ffe9a8", hill: "#e0a020", hill2: "#b87800", shine: true },
  rivalry: { bg: "#f26b5b", sky: "#ffb38a", hill: "#c8283a", hill2: "#7a1020" },
  legend: { bg: "#b48cf0", sky: "#2a1060", hill: "#7b4fd6", hill2: "#4a2a99", shine: true },
  underdog: { bg: "#7fd18b", sky: "#bff0c8", hill: "#22a04b", hill2: "#0a4420" },
  undefeated: { bg: "#7fb0f5", sky: "#dbe5ff", hill: "#2f5de0", hill2: "#1f3fa3" },
};

export function TradingCard({ c }: { c: CardView }) {
  const t = INNER[c.edition];
  const s = c.stats;
  const moves: { icon: string; name: string; value: string }[] = [
    ...c.top.map((g) => ({ icon: g.icon, name: g.name, value: `${g.wins} ${g.wins === 1 ? "ZEGE" : "ZEGES"}` })),
    { icon: "🔥", name: "Langste reeks", value: String(s.streak) },
  ];
  if (moves.length < 3) moves.unshift({ icon: "🎲", name: "Nog geen zeges", value: "-" });
  if (moves.length < 3) moves.unshift({ icon: "🎮", name: "Speel een potje!", value: "-" });
  const night = c.edition === "legend";
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: "#ffd84a", border: `${em(0.18)} solid #1e1b2b`, borderRadius: em(0.55), padding: em(0.5) }}
    >
      <div className="flex h-full flex-col" style={{ background: t.bg, border: `${em(0.14)} solid #1e1b2b`, padding: em(0.4), fontWeight: 800, color: "#1e1b2b" }}>
        <div className="flex items-baseline justify-between" style={{ gap: em(0.3) }}>
          <span className="pixel min-w-0 truncate uppercase" style={{ fontSize: em(fit(c.name, 0.6, 10)) }}>
            {c.name}
          </span>
          <span className="pixel shrink-0" style={{ fontSize: em(0.5), color: "#a3001c" }}>
            {ovrText(c)}
            {star(c)} OVR
          </span>
        </div>

        <div
          className="relative overflow-hidden"
          style={{ height: em(8.6), marginTop: em(0.4), border: `${em(0.2)} solid #c9cbd6`, outline: `${em(0.14)} solid #1e1b2b`, background: t.sky }}
        >
          <svg viewBox="0 0 40 22" preserveAspectRatio="none" shapeRendering="crispEdges" className="absolute inset-0 h-full w-full" aria-hidden>
            {night ? (
              <>
                <rect x="5" y="3" width="1" height="1" fill="#fff" />
                <rect x="14" y="6" width="1" height="1" fill="#fff" />
                <rect x="31" y="2" width="1" height="1" fill="#fff" />
                <rect x="36" y="8" width="1" height="1" fill="#fff" />
                <rect x="30" y="4" width="3" height="3" fill="#fff1b8" />
              </>
            ) : (
              <>
                <rect x="3" y="3" width="6" height="2" fill="#fff" />
                <rect x="4" y="2" width="3" height="1" fill="#fff" />
                <rect x="28" y="5" width="7" height="2" fill="#fff" />
              </>
            )}
            <path d="M0 16h4v-2h4v-1h5v1h3v2h6v-3h5v-1h4v1h3v2h6v8H0z" fill={t.hill} />
            <path d="M0 19h40v3H0z" fill={t.hill2} />
          </svg>
          <span className="absolute left-1/2 block -translate-x-1/2" style={{ width: em(5.6), height: em(5.6), bottom: em(0.9) }}>
            <PixelEmoji emoji={c.emoji} letter={c.name.slice(0, 1)} color={c.color} className="block h-full w-full" />
          </span>
          {t.shine && <span className="player-card-shine" aria-hidden />}
        </div>

        <p
          className="truncate text-center uppercase"
          style={{ fontSize: em(0.46), background: "#ffe9a8", border: `${em(0.09)} solid #1e1b2b`, margin: `${em(0.75)} ${em(0.6)} ${em(0.2)}`, padding: em(0.1) }}
        >
          {c.nickname} · LV {c.level}
        </p>

        {moves.slice(-3).map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between"
            style={{ borderBottom: `${em(0.09)} solid rgba(30,27,43,.45)`, padding: `${em(0.32)} ${em(0.1)}`, gap: em(0.3) }}
          >
            <span className="min-w-0 truncate" style={{ fontSize: em(0.66) }}>
              {m.icon} {m.name}
            </span>
            <span className="pixel shrink-0" style={{ fontSize: em(0.44) }}>
              {m.value}
            </span>
          </div>
        ))}

        <div className="flex justify-between" style={{ fontSize: em(0.44), marginTop: em(0.4), gap: em(0.3) }}>
          <span className="min-w-0 truncate">{c.weak ? `Zwakte: ${c.weak.icon} ${c.weak.name}` : `WIN ${s.winPct}%`}</span>
          <span className="shrink-0">
            {s.trophies ? `🏆 ×${s.trophies}` : ""} {c.weak ? `WIN ${s.winPct}%` : ""}
          </span>
        </div>
        <p className="pixel mt-auto text-center" style={{ fontSize: em(0.32), opacity: 0.7 }}>
          GAME NIGHT · {editionLabel(c)}
        </p>
      </div>
    </div>
  );
}
