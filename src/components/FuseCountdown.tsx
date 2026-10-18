"use client";

import { useEffect, useState } from "react";

/** Raster tekenen: elk teken is een kleur, "." is leeg. */
function Pixels({ grid, colors, className }: { grid: string[]; colors: Record<string, string>; className?: string }) {
  return (
    <svg viewBox={`0 0 ${grid[0].length} ${grid.length}`} className={className} shapeRendering="crispEdges" aria-hidden>
      {grid.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={colors[ch]} />,
        ),
      )}
    </svg>
  );
}

// Bom: rond lijf met een dopje linksboven waar de lont in gaat
const BOMB = (() => {
  const body = [
    "....OOOO....",
    "..OOBBBBOO..",
    ".OBBBBBBwwO.",
    ".OBBBBBBBwO.",
    "OBBBBBBBBBBO",
    "OBBBBBBBBBBO",
    "OBBBBBBBBBBO",
    "OBBBBBBBBBBO",
    ".OBBBBBBBBO.",
    ".OBBBBBBBBO.",
    "..OOBBBBOO..",
    "....OOOO....",
  ];
  const cap = ["OOOO", "OggO", "OOOO"];
  const g = Array.from({ length: 15 }, () => Array(14).fill("."));
  body.forEach((r, y) => r.split("").forEach((c, x) => c !== "." && (g[y + 3][x + 2] = c)));
  cap.forEach((r, y) => r.split("").forEach((c, x) => (g[y + 1][x + 1] = c)));
  return g.map((r) => r.join(""));
})();

const SPARK = [
  "...y...",
  ".y.o.y.",
  "..oWo..",
  "yoWWWoy",
  "..oWo..",
  ".y.o.y.",
  "...y...",
];

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");
const day = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date(ms));

/** Een pixel-bom waarvan het lontje korter wordt naarmate de avond dichterbij komt. */
export function FuseCountdown({ startsAt, createdAt, serverNow }: { startsAt: string; createdAt: string; serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = new Date(startsAt).getTime();
  const made = new Date(createdAt).getTime();
  const left = start - now;
  // Lont is vol als de avond net gepland is en brandt op tot het begin
  const total = Math.max(start - made, 86_400_000);
  const frac = Math.min(1, Math.max(0.04, left / total));
  const t = parts(left);

  if (left <= 0) {
    return (
      <div className="mt-3 rounded-xl border-2 border-line bg-night px-3 py-3 text-center text-white">
        <p className="pixel text-[14px] text-yellow">💥 BOEM!</p>
        <p className="mt-1 text-xs font-bold opacity-80">Het is zover. Wachten tot de host de avond start…</p>
      </div>
    );
  }

  const hot = left < 86_400_000;
  const panic = left < 3_600_000;
  const label = panic ? "BIJNA!" : hot ? (day(start) === day(now) ? "VANAVOND!" : "MORGEN!") : "LONT BRANDT";
  const segs: [string, string][] = t.d > 0
    ? [[String(t.d), t.d === 1 ? "DAG" : "DGN"], [pad(t.h), "UUR"], [pad(t.m), "MIN"], [pad(t.s), "SEC"]]
    : [[pad(t.h), "UUR"], [pad(t.m), "MIN"], [pad(t.s), "SEC"]];

  return (
    <div className="mt-3 rounded-xl border-2 border-line bg-night px-3 pb-2 pt-3 text-white" role="timer" aria-label={`Nog ${t.d} dagen, ${t.h} uur en ${t.m} minuten`}>
      <div className={`fuse ${hot ? "fuse-hot" : ""} ${panic ? "fuse-panic" : ""}`}>
        <div className="fuse-track">
          <div className="fuse-ash" />
          <div className="fuse-rope" style={{ width: `${frac * 100}%` }}>
            <span className="fuse-spark">
              <Pixels grid={SPARK} colors={{ y: "#ffe066", o: "#ff8a1f", W: "#ffffff" }} />
            </span>
          </div>
          <div className="absolute bottom-0 left-0 flex items-end gap-2.5">
            {segs.map(([v, l]) => (
              <div key={l} className="text-center">
                <p className="pixel text-[15px] leading-none text-yellow">{v}</p>
                <p className="mt-1 text-[8px] font-black tracking-wider opacity-70">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <Pixels
          grid={BOMB}
          colors={{ O: "#000000", B: panic ? "#5a1d2a" : "#3b3a52", w: "#c9c8e0", g: "#8d8aa8" }}
          className="fuse-bomb"
        />
      </div>
      <p className="pixel mt-1.5 text-[8px] text-[#ff8a1f]">{label}</p>
    </div>
  );
}
