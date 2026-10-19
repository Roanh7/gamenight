"use client";

import { useEffect } from "react";
import { playUnderdog, soundOn } from "@/lib/sfx";

// Pixel-maan (1 = maan, 2 = krater)
const MOON = ["..1111..", ".111111.", "11112111", "11111111", "12111111", "11111211", ".111111.", "..1111.."];
const STARS = [
  [6, 6], [16, 16], [30, 3], [66, 4], [92, 24], [5, 28], [76, 30],
];

/** "🐺 UNDERDOG VICTORY! +2 BONUS POINTS — Against all odds!" Met animatie + geluid als `fresh`. */
export function UnderdogVictory({ names, bonus, fresh = false }: { names: string[]; bonus: number; fresh?: boolean }) {
  useEffect(() => {
    if (!fresh || !soundOn()) return;
    // Na het gewone overwinningsdeuntje
    const t = setTimeout(playUnderdog, 1100);
    return () => clearTimeout(t);
  }, [fresh]);

  if (!names.length) return null;
  return (
    <section
      className={`ud-card card relative shadow-[0_4px_0_var(--color-line),inset_0_0_0_2px_#ffc52799] mb-4 overflow-hidden bg-night p-5 text-center text-white ${fresh ? "ud-in" : ""}`}
      role="status"
    >
      <svg viewBox="0 0 100 40" className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full" shapeRendering="crispEdges" aria-hidden>
        {STARS.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="1.6" height="1.6" fill="#fff3cc" className="ud-star" style={{ animationDelay: `${i * 0.23}s` }} />
        ))}
        <g transform="translate(80 3)">
          {MOON.flatMap((row, y) =>
            [...row].map((ch, x) =>
              ch === "." ? null : <rect key={`${x}-${y}`} x={x * 1.6} y={y * 1.6} width="1.6" height="1.6" fill={ch === "2" ? "#e8b100" : "#ffc527"} />,
            ),
          )}
        </g>
      </svg>
      <div className="relative">
        <p className={`text-5xl ${fresh ? "ud-howl" : ""}`} aria-hidden>
          🐺
        </p>
        <p className="pixel mt-2 text-[13px] leading-relaxed text-yellow">UNDERDOG VICTORY!</p>
        <p className={`pixel mt-2 inline-block rounded-lg border-2 border-yellow px-2 py-1 text-[11px] ${fresh ? "ud-bonus" : ""}`}>
          +{bonus} BONUS POINTS
        </p>
        <p className="mt-2 text-sm font-black italic opacity-90">Against all odds!</p>
        <p className="mt-1 text-sm font-bold">{names.join(" & ")}</p>
      </div>
    </section>
  );
}
