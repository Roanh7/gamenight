/**
 * Kleine pixel-art iconen (scherpe SVG, geen plaatjes). "#" = huidige tekstkleur (currentColor),
 * "o" = accent (var(--pi-accent), standaard geel). Werkt dus vanzelf in licht en donker.
 */
const ICONS = {
  home: [
    ".....##.....",
    "....####....",
    "...######...",
    "..########..",
    ".##########.",
    "############",
    ".##########.",
    ".####oo####.",
    ".####oo####.",
    ".####oo####.",
    ".####oo####.",
  ],
  calendar: [
    "..##....##..",
    "############",
    "############",
    "#..........#",
    "#.oo.##.##.#",
    "#.oo.##.##.#",
    "#..........#",
    "#.##.##.##.#",
    "#.##.##.##.#",
    "#..........#",
    "############",
  ],
  gamepad: [
    "............",
    ".##########.",
    "############",
    "##.######o##",
    "#...####o.o#",
    "##.######o##",
    "############",
    "####....####",
    ".##......##.",
  ],
  players: [
    "..##....##..",
    ".####..####.",
    ".####..####.",
    "..##....##..",
    "............",
    ".###....###.",
    "#####..#####",
    "#####..#####",
    "#####..#####",
  ],
  trophy: [
    "############",
    "#.###oo###.#",
    "#.###oo###.#",
    ".##########.",
    "..########..",
    "...######...",
    "....####....",
    ".....##.....",
    ".....##.....",
    "...######...",
    "..########..",
  ],
  live: [
    "#..........#",
    "#.#......#.#",
    "#.#.#..#.#.#",
    "#.#.#oo#.#.#",
    "#.#.#oo#.#.#",
    "#.#.#..#.#.#",
    "#.#......#.#",
    "#..........#",
  ],
  plus: [
    "....####....",
    "....####....",
    "....####....",
    "############",
    "############",
    "....####....",
    "....####....",
    "....####....",
  ],
  grid: [
    "#####..#####",
    "#####..#####",
    "#####..#####",
    "#####..#####",
    "............",
    "............",
    "#####..#####",
    "#####..#####",
    "#####..#####",
    "#####..#####",
  ],
  // Kleine iconen voor de HUD-tegels (8×8)
  target: [
    "..####..",
    ".#....#.",
    "#..##..#",
    "#.#oo#.#",
    "#.#oo#.#",
    "#..##..#",
    ".#....#.",
    "..####..",
  ],
  flame: [
    "....#...",
    "...##...",
    "..###.#.",
    ".######.",
    "########",
    "###oo###",
    ".##oo##.",
    "..####..",
  ],
  bars: [
    "......##",
    "......##",
    "...##.##",
    "...##.##",
    "##.##.##",
    "##.##.##",
    "##.##.##",
    "########",
  ],
  crown: [
    "#..##..#",
    "#..##..#",
    "##.##.##",
    "########",
    "########",
    "#o####o#",
    "########",
  ],
  news: [
    "##########..",
    "#........###",
    "#.oooo...#.#",
    "#.oooo.#.#.#",
    "#........#.#",
    "#.######.#.#",
    "#.######.#.#",
    "#........#.#",
    "############",
  ],
} as const;

export type PixelIconName = keyof typeof ICONS;

function toPaths(rows: readonly string[]) {
  const out: Record<string, string[]> = { "#": [], o: [] };
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === ".") {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < row.length && row[e + 1] === c) e++;
      out[c]?.push(`M${x} ${y}h${e - x + 1}v1h-${e - x + 1}z`);
      x = e + 1;
    }
  });
  return { main: out["#"].join(""), accent: out.o.join("") };
}

const CACHE = new Map<string, { w: number; h: number; main: string; accent: string }>();

export function PixelIcon({ name, size = 20, className = "" }: { name: PixelIconName; size?: number; className?: string }) {
  let d = CACHE.get(name);
  if (!d) {
    const rows = ICONS[name];
    d = { w: Math.max(...rows.map((r) => r.length)), h: rows.length, ...toPaths(rows) };
    CACHE.set(name, d);
  }
  const s = Math.max(d.w, d.h);
  return (
    <svg
      viewBox={`${(d.w - s) / 2} ${(d.h - s) / 2} ${s} ${s}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d={d.main} fill="currentColor" />
      {d.accent && <path d={d.accent} fill="var(--pi-accent, var(--color-yellow))" />}
    </svg>
  );
}
