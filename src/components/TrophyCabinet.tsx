"use client";

import { useState } from "react";

/* Pixel-sprites op een 12x12 raster. "." is leeg, andere tekens zijn kleuren. */
const SPRITES = {
  cup: [
    "..OOOOOOOO..",
    "OOOyYYYYDOOO",
    "O.OyYYYYDO.O",
    "O.OyYYYYDO.O",
    ".OOyYYYYDOO.",
    "...OyYYDO...",
    "....OYDO....",
    "....OYDO....",
    ".....OO.....",
    "...OOOOOO...",
    "...OYYYDO...",
    "..OOOOOOOO..",
  ],
  star: [
    ".....OO.....",
    "....OyYO....",
    "....OyYO....",
    "OOOOOyYYOOOO",
    "OyYYYYYYYYDO",
    ".OYYYYYYYDO.",
    "..OYYYYYDO..",
    "..OYYYYYYO..",
    ".OYYYDDYYYO.",
    ".OYYDOODYYO.",
    "OYDDO..ODDYO",
    "OOO......OOO",
  ],
  medal: [
    ".OBBO..ORRO.",
    ".OBBBOORRRO.",
    "..OBBBRRRO..",
    "...OBBRRO...",
    "....OOOO....",
    "...OYYYYO...",
    "..OYyYYYDO..",
    "..OyYYYYDO..",
    "..OYYYYYDO..",
    "..OYYYYDDO..",
    "...ODDDDO...",
    "....OOOO....",
  ],
  crown: [
    "............",
    "............",
    "O....OO....O",
    "OO..OYYO..OO",
    "OYO.OYYO.OYO",
    "OYYOYYYYOYYO",
    "OYYYYRRYYYYO",
    "OYYYRRRRYYYO",
    "OYYYYRRYYYYO",
    "OyyyyyyyyyyO",
    "ODDDDDDDDDDO",
    "OOOOOOOOOOOO",
  ],
  flame: [
    ".....O......",
    "....ORO.....",
    "....ORRO....",
    "...ORRRO.O..",
    "..ORRRRRORO.",
    "..ORRoRRRRO.",
    ".ORRoooRRRO.",
    ".ORooyooRRO.",
    ".ORoyyyoRRO.",
    ".ORoyyyoRO..",
    "..ORooooRO..",
    "...OOOOOO...",
  ],
  home: [
    ".....OO.....",
    "....ORRO....",
    "...ORRRRO...",
    "..ORRRRRRO..",
    ".ORRRRRRRRO.",
    "OOOOOOOOOOOO",
    ".OwwwwwwwwO.",
    ".OwBBwOOOwO.",
    ".OwBBwONOwO.",
    ".OwwwwONOwO.",
    ".OwwwwONOwO.",
    "OOOOOOOOOOOO",
  ],
  swords: [
    "O..........O",
    "OO........OO",
    ".OsO....OsO.",
    "..OsO..OsO..",
    "...OsOOsO...",
    "....OssO....",
    "....OssO....",
    "...OsOOsO...",
    ".OOsO..OsOO.",
    ".ONO....ONO.",
    "ONO......ONO",
    "OO........OO",
  ],
  sparkles: [
    "............",
    "............",
    "...OOOOOO...",
    "..OwCCCCbO..",
    ".OwCCCCCCbO.",
    "OOOOOOOOOOOO",
    ".OCCCCCCCbO.",
    "..OCCCCCbO..",
    "...OCCCbO...",
    "....OCbO....",
    ".....OO.....",
    "............",
  ],
  target: [
    "....OOOO....",
    "..OORRRROO..",
    ".ORRwwwwRRO.",
    ".ORwwRRwwRO.",
    "ORwwRwwRwwRO",
    "ORwRwRRwRwRO",
    "ORwRwRRwRwRO",
    "ORwwRwwRwwRO",
    ".ORwwRRwwRO.",
    ".ORRwwwwRRO.",
    "..OORRRROO..",
    "....OOOO....",
  ],
} as const;

export type SpriteName = keyof typeof SPRITES;

const GOLD = { O: "#2b1a08", Y: "#ffc527", y: "#fff1a8", D: "#d18a0c", R: "#e4002b", B: "#2f6fe4", o: "#ff8a1f", w: "#ffffff", N: "#7a4a24", s: "#d9dde8", C: "#46c7e8", b: "#1d8fb8" };
const SILVER = { ...GOLD, Y: "#c9d1de", y: "#ffffff", D: "#8f9bb0" };

export function TrophySprite({ name, silver, locked, size = 44 }: { name: SpriteName; silver?: boolean; locked?: boolean; size?: number }) {
  const grid = SPRITES[name];
  const pal: Record<string, string> = silver ? SILVER : GOLD;
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {grid.flatMap((row, y) =>
        row.split("").map((ch, x) =>
          ch === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1.02}
              height={1.02}
              fill={locked ? (ch === "O" ? "#1d120a" : "#2a1a0e") : pal[ch]}
            />
          ),
        ),
      )}
    </svg>
  );
}

export type CabinetItem = {
  id: string;
  sprite: SpriteName;
  title: string;
  description: string;
  earned: boolean;
  progress?: string;
  plaque?: string;
  silver?: boolean;
};

/** De trofeekast: bekers en titels bovenin, achievements op de planken eronder. */
export function TrophyCabinet({ cups, achievements, isMe }: { cups: CabinetItem[]; achievements: CabinetItem[]; isMe: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const all = [...cups, ...achievements];
  const picked = all.find((i) => i.id === sel);
  const earned = achievements.filter((a) => a.earned).length;
  const rows = [achievements.slice(0, 5), achievements.slice(5, 10), achievements.slice(10)].filter((r) => r.length);

  const item = (i: CabinetItem, n: number) => (
    <button
      key={i.id}
      type="button"
      className={`shelf-item ${i.earned ? "earned" : ""}`}
      aria-pressed={sel === i.id}
      aria-label={`${i.title}${i.earned ? "" : " (nog niet behaald)"}`}
      onClick={() => setSel(sel === i.id ? null : i.id)}
    >
      <span className="relative">
        <TrophySprite name={i.sprite} silver={i.silver} locked={!i.earned} size={i.plaque ? 46 : 40} />
        {i.earned && (
          <span className="shelf-glint absolute -right-1 -top-1 text-[10px] leading-none text-white" style={{ ["--d" as string]: `${(n * 0.7) % 3}s` }}>
            ✦
          </span>
        )}
        {!i.earned && <span className="pixel absolute inset-0 flex items-center justify-center text-[10px] text-[#8a6a4a]">?</span>}
      </span>
      {i.plaque && <span className="shelf-plaque">{i.plaque}</span>}
    </button>
  );

  return (
    <div className="mt-8 scroll-mt-20" id="trofeekast">
      <div className="cabinet">
        <p className="cabinet-sign pixel text-[10px]">TROFEEKAST {earned}/{achievements.length}</p>
        <div className="cabinet-inside">
          <div className="shelf">
            <span className="shelf-label pixel">BEKERS &amp; TITELS</span>
            {cups.length ? (
              cups.map(item)
            ) : (
              <p className="self-center pb-3 pt-2 text-center text-xs font-bold text-[#e8c48a]/70">
                {isMe ? "Nog leeg… win een seizoen of word #1 in een game." : "Nog geen bekers. Stof op de plank."}
              </p>
            )}
          </div>
          {rows.map((r, ri) => (
            <div key={ri} className="shelf">
              {ri === 0 && <span className="shelf-label pixel">ACHIEVEMENTS</span>}
              {r.map((i, n) => item(i, n + ri * 5 + cups.length))}
            </div>
          ))}
        </div>
        <div className="cabinet-caption" aria-live="polite">
          {picked ? (
            <>
              <p className="text-sm font-black leading-tight">
                {picked.earned ? "✨ " : "🔒 "}
                {picked.title}
              </p>
              <p className="text-xs">
                {picked.description}
                {picked.earned ? " · Behaald!" : picked.progress ? ` · ${picked.progress}` : ""}
              </p>
            </>
          ) : (
            <p className="pt-2 text-center text-xs font-bold">Tik op een prijs om te zien wat het is.</p>
          )}
        </div>
      </div>
    </div>
  );
}
