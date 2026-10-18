import type { ReactNode } from "react";
import { bannerDef, type Rarity } from "@/lib/banners";

/*
 * Pixel-art profielbanners, getekend met SVG-blokjes (geen plaatjes, geen downloads).
 * Elke banner is 200 x 56 "pixels". Het belangrijkste staat in het midden, zodat hij
 * er op elke schermbreedte goed uitziet (de zijkanten of boven/onder vallen soms weg).
 * Animaties zijn kleine CSS-effecten (zie .bn-* in globals.css) en staan uit bij
 * "verminder beweging" en in de kleine voorbeelden.
 */

const W = 200;
const H = 56;

type Px = [x: number, y: number, w: number, h: number, fill: string];

function rects(list: Px[], className?: string, style?: React.CSSProperties) {
  return (
    <g className={className} style={style}>
      {list.map(([x, y, w, h, f], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={f} />
      ))}
    </g>
  );
}

/** Raster van tekens → blokjes ("." is leeg). */
function grid(rows: string[], colors: Record<string, string>, ox: number, oy: number, s = 1): Px[] {
  const out: Px[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let n = 1;
      while (x + n < row.length && row[x + n] === ch) n++;
      out.push([ox + x * s, oy + y * s, n * s, s, colors[ch]]);
      x += n;
    }
  });
  return out;
}

/** Vaste "willekeur" zodat de server en de telefoon hetzelfde tekenen. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lucht in horizontale banden (geen vloeiend verloop, echt 8-bit). */
function bands(colors: string[], top = 0, bottom = H): Px[] {
  const h = (bottom - top) / colors.length;
  return colors.map((c, i) => [0, Math.round(top + i * h), W, Math.ceil(h) + 1, c]);
}

/** Heuvelrand in trapjes. */
function hills(base: number, amp: number, period: number, phase: number, color: string, step = 2): Px[] {
  const out: Px[] = [];
  for (let x = 0; x < W; x += step) {
    const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin((x / period) * Math.PI * 2 + phase)));
    out.push([x, y, step, H - y, color]);
  }
  return out;
}

function stars(seed: number, n: number, colors: string[], maxY = H, twinkle = true) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = Math.floor(r() * W);
        const y = Math.floor(r() * maxY);
        const big = r() > 0.85;
        const c = colors[Math.floor(r() * colors.length)];
        const tw = twinkle && r() > 0.5;
        return (
          <g key={i} className={tw ? "bn-twinkle" : undefined} style={tw ? { animationDelay: `${(r() * 3).toFixed(2)}s` } : undefined}>
            <rect x={x} y={y} width={1} height={1} fill={c} />
            {big && (
              <>
                <rect x={x - 1} y={y} width={3} height={1} fill={c} opacity={0.5} />
                <rect x={x} y={y - 1} width={1} height={3} fill={c} opacity={0.5} />
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}

function cloud(x: number, y: number, light: string, shade: string): Px[] {
  return grid(
    ["...LLLL.....", ".LLLLLLLL.LL", "LLLLLLLLLLLL", "SSSSSSSSSSSS"],
    { L: light, S: shade },
    x,
    y,
    2,
  );
}

function sparkles(seed: number, n: number, color: string, area: [number, number, number, number]) {
  const r = rng(seed);
  const [x0, y0, w, h] = area;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + Math.floor(r() * w);
        const y = y0 + Math.floor(r() * h);
        return (
          <g key={i} className="bn-sparkle" style={{ animationDelay: `${(r() * 3).toFixed(2)}s` }}>
            <rect x={x} y={y - 2} width={1} height={5} fill={color} />
            <rect x={x - 2} y={y} width={5} height={1} fill={color} />
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* De tien werelden                                                    */
/* ------------------------------------------------------------------ */

function RookieFields() {
  const flowers: Px[] = [];
  const r = rng(7);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * W);
    flowers.push([x, 49, 1, 2, "#2f7d3a"], [x - 1, 48, 3, 1, r() > 0.5 ? "#ffe066" : "#ff7aa8"]);
  }
  return (
    <>
      {rects(bands(["#5cb8ff", "#74c4ff", "#8ccfff", "#a6dbff"], 0, 46))}
      {rects(grid(["..YYYY..", ".YYYYYY.", "YYYYYYYY", "YYYYYYYY", ".YYYYYY.", "..YYYY.."], { Y: "#ffe066" }, 160, 5, 1.5))}
      <g className="bn-drift">
        {rects(cloud(14, 8, "#ffffff", "#d6ecff"))}
        {rects(cloud(84, 4, "#ffffff", "#d6ecff"))}
        {rects(cloud(130, 14, "#ffffff", "#d6ecff"))}
        {rects(cloud(214, 8, "#ffffff", "#d6ecff"))}
        {rects(cloud(284, 4, "#ffffff", "#d6ecff"))}
      </g>
      {rects(hills(40, 16, 90, 1.2, "#8fd694"))}
      {rects(hills(46, 12, 60, 3.4, "#5ec26a"))}
      {rects([[0, 47, W, 9, "#3e9b4f"], [0, 47, W, 1, "#7fe08a"], [0, 52, W, 4, "#8a5a2b"], [0, 52, W, 1, "#6b4220"]])}
      {rects(flowers)}
      {rects(grid(["BBBBBBBBBBBB", "bBbbbBbbbBbb", "BBBBBBBBBBBB"], { B: "#c46a2c", b: "#8a4a1c" }, 88, 26, 2))}
      {rects(grid(["CC", "Cc", "CC"], { C: "#ffd23f", c: "#c99a10" }, 96, 18, 2), "bn-bob")}
      {rects(grid(["CC", "Cc", "CC"], { C: "#ffd23f", c: "#c99a10" }, 104, 18, 2), "bn-bob", { animationDelay: "0.3s" })}
    </>
  );
}

function MidnightGamer() {
  const moon = grid(
    ["...MMMM...", ".MMMMMMMM.", "MMMMMmMMMM", "MMmMMMMMMM", "MMMMMMMmMM", "MMMMMMMMMM", ".MMMmMMMM.", "...MMMM..."],
    { M: "#fff4c2", m: "#e6d98f" },
    146,
    6,
    2,
  );
  const house = grid(
    ["....RR....", "...RRRR...", "..RRRRRR..", ".RRRRRRRR.", "WWWWWWWWWW", "WwwWWWWwwW", "WwwWWWWwwW", "WWWWDDWWWW", "WWWWDDWWWW"],
    { R: "#2b1f4a", W: "#1a2246", w: "#ffd86b", D: "#0c1028" },
    40,
    31,
    2,
  );
  return (
    <>
      {rects(bands(["#070b26", "#0b1440", "#101c55", "#16256a"], 0, 48))}
      {stars(11, 46, ["#ffffff", "#cfd8ff", "#fff1a8"], 36)}
      <g className="bn-glow-soft">{rects(moon)}</g>
      {rects(hills(42, 12, 80, 0.4, "#13234d"))}
      {rects(hills(49, 8, 55, 2.2, "#0c1733"))}
      {rects(house)}
      {rects([[0, 50, W, 6, "#080f24"]])}
      <g className="bn-twinkle" style={{ animationDelay: "1.1s" }}>
        {rects([[118, 40, 1, 1, "#9dff9d"], [124, 44, 1, 1, "#9dff9d"], [70, 46, 1, 1, "#9dff9d"]])}
      </g>
    </>
  );
}

function Inferno() {
  const volcano: Px[] = [];
  for (let y = 14; y < 50; y++) {
    const half = Math.round(8 + (y - 14) * 1.9);
    volcano.push([100 - half, y, half * 2, 1, y % 4 === 0 ? "#3a2420" : "#2b1b18"]);
  }
  const lavaFlow: Px[] = [];
  for (let y = 16; y < 46; y += 2) {
    const off = Math.round(Math.sin(y / 3) * 2);
    lavaFlow.push([96 + off - Math.floor((y - 16) / 6), y, 3, 2, y % 4 ? "#ff6a00" : "#ffb000"]);
  }
  const r = rng(5);
  return (
    <>
      {rects(bands(["#1a0505", "#2d0a07", "#4a1208", "#6e1d0b", "#8f2a0c"], 0, 50))}
      {stars(3, 14, ["#ff9b5c"], 30, true)}
      {rects(hills(46, 10, 50, 0.8, "#1f1311"))}
      {rects(volcano)}
      {rects([[90, 12, 20, 3, "#ff6a00"], [93, 11, 14, 1, "#ffb000"], [86, 14, 4, 2, "#2b1b18"], [110, 14, 4, 2, "#2b1b18"]])}
      <g className="bn-glow">{rects(lavaFlow)}</g>
      {rects(grid(["..SS..", ".SSSS.", "SSSSSS"], { S: "#3b2a26" }, 92, 2, 2), "bn-rise")}
      <g className="bn-glow">
        {rects([[0, 50, W, 6, "#ff6a00"], [0, 50, W, 1, "#ffcc33"], [0, 53, W, 1, "#ffb000"]])}
        {rects(Array.from({ length: 12 }, (_, i) => [Math.floor(r() * W), 51 + (i % 3), 4, 1, "#ffe08a"] as Px))}
      </g>
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} className="bn-ember" style={{ animationDelay: `${(i * 0.37).toFixed(2)}s` }} x={20 + i * 17} y={48} width={1} height={1} fill="#ffcc33" />
      ))}
      {rects(grid(["RRR...", "RRRRR.", "RRRRRR"], { R: "#140b0a" }, 12, 44, 2))}
      {rects(grid(["...RRR", ".RRRRR", "RRRRRR"], { R: "#140b0a" }, 170, 44, 2))}
    </>
  );
}

function Thunderstorm() {
  const r = rng(9);
  const rain: Px[] = Array.from({ length: 40 }, () => [Math.floor(r() * W), 14 + Math.floor(r() * 40), 1, 3, "#8f7fd8"] as Px);
  const bolt = grid(
    ["....YY", "...YY.", "..YY..", ".YYYYY", "...YY.", "..YY..", ".YY...", "YY...."],
    { Y: "#fff6b0" },
    120,
    14,
    3,
  );
  const bolt2 = grid(["..Y", ".Y.", "YYY", ".Y.", "Y.."], { Y: "#d9ccff" }, 40, 16, 3);
  const cloudRow = (y: number, light: string, dark: string, seed: number): Px[] => {
    const rr = rng(seed);
    const out: Px[] = [];
    for (let x = -4; x < W + 4; x += 4) {
      const h = 6 + Math.floor(rr() * 8);
      out.push([x, y, 4, h, rr() > 0.6 ? light : dark]);
    }
    return out;
  };
  return (
    <>
      {rects(bands(["#1d0f33", "#2a1446", "#3b1d63", "#4c2780", "#5d3399"], 0, H))}
      <g className="bn-flash-sky">{rects([[0, 0, W, H, "#b9a6ff"]])}</g>
      <g className="bn-flash">{rects(bolt)}</g>
      <g className="bn-flash" style={{ animationDelay: "1.7s" }}>{rects(bolt2)}</g>
      <g opacity={0.3}>{rects(bolt)}</g>
      {rects(cloudRow(0, "#2f2450", "#1d1530", 4))}
      {rects(cloud(-6, 4, "#3a2d63", "#1d1530"))}
      {rects(cloud(30, 8, "#2f2450", "#1a1230"))}
      {rects(cloud(64, 2, "#3a2d63", "#1d1530"))}
      {rects(cloud(100, 9, "#2f2450", "#1a1230"))}
      {rects(cloud(136, 3, "#3a2d63", "#1d1530"))}
      {rects(cloud(172, 8, "#2f2450", "#1a1230"))}
      <g className="bn-rain">{rects(rain)}</g>
      {rects(hills(50, 8, 70, 1.5, "#140c24"))}
      {rects([[0, 52, W, 4, "#0d0818"]])}
    </>
  );
}

function Graveyard() {
  const tree = (x: number, s: number) =>
    grid(
      ["T....T..T", ".T..T..T.", "..T.TTT..", "...TT....", "...TT..T.", "T..TTTT..", ".TTTT....", "...TT....", "...TT....", "...TT....", "..TTTT..."],
      { T: "#0b0b1e" },
      x,
      56 - 11 * s - 3,
      s,
    );
  const stone = (x: number, y: number, cross = false) =>
    cross
      ? grid(["..S..", "SSSSS", "..S..", "..S..", "..S.."], { S: "#9ea3c2" }, x, y, 2)
      : grid([".SSS.", "SSSSS", "SsSsS", "SSSSS", "SSSSS"], { S: "#8a8fae", s: "#5d6285" }, x, y, 2);
  return (
    <>
      {rects(bands(["#141533", "#1b1d3a", "#232650", "#2c2f60"], 0, 50))}
      {stars(21, 22, ["#c9c6ff", "#ffffff"], 30)}
      {rects(grid(["..MMM", ".MM..", "MM...", "MM...", "MM...", ".MM..", "..MMM"], { M: "#e8e4ff" }, 150, 5, 2))}
      {rects(hills(46, 6, 90, 0.2, "#191a36"))}
      {rects(tree(8, 3))}
      {rects(tree(166, 3))}
      {rects(stone(58, 38))}
      {rects(stone(80, 36, true))}
      {rects(stone(102, 39))}
      {rects(stone(124, 37))}
      {rects([[0, 48, W, 8, "#101127"]])}
      <g className="bn-fog">{rects([[-40, 44, 120, 3, "#c9c6ff"], [70, 47, 140, 3, "#c9c6ff"], [180, 43, 90, 2, "#c9c6ff"]])}</g>
      <g className="bn-bob" style={{ animationDuration: "3s" }}>
        {rects(grid([".GGG.", "GGGGG", "GkGkG", "GGGGG", "G.G.G"], { G: "#f2f0ff", k: "#1b1d3a" }, 140, 26, 2))}
      </g>
    </>
  );
}

function CosmicLegend() {
  const nebula = (cx: number, cy: number, rx: number, ry: number, color: string, seed: number): Px[] => {
    const r = rng(seed);
    const out: Px[] = [];
    for (let y = -ry; y <= ry; y += 2) {
      for (let x = -rx; x <= rx; x += 2) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d < 1 && r() > d * 0.9) out.push([cx + x, cy + y, 2, 2, color]);
      }
    }
    return out;
  };
  const planet: Px[] = [];
  for (let y = -10; y <= 10; y++) {
    for (let x = -10; x <= 10; x++) {
      if (x * x + y * y <= 100) planet.push([150 + x, 26 + y, 1, 1, x + y < -6 ? "#ffb56b" : x * x + y * y > 70 ? "#b34a2a" : y % 4 === 0 ? "#e8743a" : "#d0602f"]);
    }
  }
  const moonlet: Px[] = [];
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) moonlet.push([30 + x, 42 + y, 1, 1, x < 0 && y < 0 ? "#9ef0c8" : "#3fa47c"]);
  const ring: Px[] = [];
  for (let x = -18; x <= 18; x++) {
    const y = Math.round(x * 0.22);
    if (Math.abs(x) > 9 || y > 0) ring.push([150 + x, 27 + y, 1, 1, "#9ee7ff"]);
  }
  return (
    <>
      {rects([[0, 0, W, H, "#07051a"]])}
      <g opacity={0.55}>{rects(nebula(60, 26, 46, 18, "#5b2a86", 2))}</g>
      <g opacity={0.45}>{rects(nebula(100, 34, 40, 14, "#2a3b8f", 3))}</g>
      <g opacity={0.35}>{rects(nebula(40, 20, 24, 10, "#b03a8a", 4))}</g>
      {stars(31, 70, ["#ffffff", "#bfe3ff", "#ffd6ff", "#fff1a8"])}
      <g className="bn-drift-slow">{rects(planet)}{rects(ring)}</g>
      {rects(moonlet)}
      <g className="bn-shoot">{rects([[0, 0, 1, 1, "#ffffff"], [-1, -1, 1, 1, "#ffffffcc"], [-2, -2, 1, 1, "#ffffff88"], [-3, -3, 1, 1, "#ffffff44"]])}</g>
    </>
  );
}

function DragonsLair() {
  const r = rng(13);
  const stalactites: Px[] = [];
  for (let x = 0; x < W; x += 4) {
    const h = 3 + Math.floor(r() * 10);
    stalactites.push([x, 0, 4, h, "#2a1d17"], [x + 1, h, 2, 2, "#2a1d17"]);
  }
  const dragon = grid(
    [
      "..........DD.......",
      ".........DDDD......",
      "....DDDDDDDDDD.....",
      "..DDDDDDDDDDDDD....",
      ".DDDEDDDDDDDDDDD...",
      "DDDDDDDDDDDDDDDDD..",
      "DDDDDDDDDDDDDDDDDD.",
      ".DD.D.D..DDDDDDDDDD",
      "........DDDDDDDDDDD",
      ".......DDDDDDDDDDDD",
      "......DDDDDDDDDDDDD",
    ],
    { D: "#0a0505", E: "#0a0505" },
    138,
    14,
    3,
  );
  const rim = dragon.map(([x, y, w, h]) => [x - 1, y - 1, w, h, "#4a1a12"] as Px);
  const gold: Px[] = [];
  for (let x = 30; x < 140; x += 2) {
    const h = Math.round(9 * Math.sin(((x - 30) / 110) * Math.PI));
    gold.push([x, 54 - h, 2, h + 2, (x / 2) % 3 === 0 ? "#ffc527" : (x / 2) % 3 === 1 ? "#e0a516" : "#ffd96b"]);
  }
  const chest = (x: number) =>
    grid(["BBBBBBBB", "BGGGGGGB", "BBBYYBBB", "BbbYYbbB", "BbbbbbbB", "BBBBBBBB"], { B: "#5a3418", b: "#7a4a24", G: "#ffc527", Y: "#ffe066" }, x, 42, 2);
  const torch = (x: number) => (
    <g>
      {rects([[x, 26, 2, 10, "#4a2e1c"]])}
      <g className="bn-flicker">{rects(grid([".F.", "FOF", "FYF", ".Y."], { F: "#ff6a00", O: "#ff9b2f", Y: "#ffe066" }, x - 1, 20, 1.5))}</g>
    </g>
  );
  return (
    <>
      {rects(bands(["#0b0706", "#120c0a", "#1a110d", "#22160f"], 0, H))}
      <g className="bn-glow-soft">{rects([[40, 30, 100, 26, "#ffb02a22"], [60, 36, 60, 20, "#ffb02a22"]])}</g>
      {rects(stalactites)}
      {rects(rim)}
      {rects(dragon)}
      <g className="bn-blink">{rects([[150, 26, 4, 2, "#ff2a2a"], [151, 26, 2, 1, "#ffe066"], [164, 25, 3, 2, "#ff2a2a"]])}</g>
      {rects(gold)}
      {sparkles(14, 6, "#fff6c8", [40, 42, 90, 10])}
      {rects(chest(36))}
      {rects(chest(118))}
      {torch(12)}
      {torch(128)}
      {rects([[0, 54, W, 2, "#0b0706"]])}
    </>
  );
}

function RoyalChampion() {
  const wall: Px[] = [];
  for (let y = 0; y < 46; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < W; x += 12) wall.push([x, y, 11, 5, "#5a1220"]);
  const flag = (x: number) =>
    grid(
      ["GGGGGGGG", "RRRRRRRR", "RRRYYRRR", "RRYYYYRR", "RRRYYRRR", "RRRRRRRR", "RRRRRRRR", "RRR..RRR", "RR....RR"],
      { G: "#ffc527", R: "#c8102e", Y: "#ffd23f" },
      x,
      4,
      2,
    );
  const pillar = (x: number): Px[] => [[x, 4, 8, 44, "#d18a0c"], [x + 1, 4, 2, 44, "#ffe08a"], [x + 6, 4, 2, 44, "#a86a08"], [x - 2, 2, 12, 3, "#ffc527"], [x - 2, 46, 12, 3, "#ffc527"]];
  const throne = grid(
    [
      "....GGGG....",
      "...GYYYYG...",
      "...GYRRYG...",
      "...GYRRYG...",
      "...GYRRYG...",
      "...GYRRYG...",
      ".GGGYYYYGGG.",
      ".GRRRRRRRRG.",
      ".GGGGGGGGGG.",
      ".G........G.",
      ".G........G.",
    ],
    { G: "#ffc527", Y: "#fff1a8", R: "#8e0c22" },
    88,
    20,
    2,
  );
  return (
    <>
      {rects([[0, 0, W, H, "#4a0d16"]])}
      {rects(wall)}
      <g className="bn-glow-soft">{rects([[76, 0, 48, 50, "#ffd23f18"], [86, 0, 28, 50, "#ffd23f18"]])}</g>
      {rects(pillar(22))}
      {rects(pillar(170))}
      {rects(flag(44))}
      {rects(flag(140))}
      {rects(grid(["Y.Y.Y", "YYYYY", "YYYYY"], { Y: "#ffd23f" }, 94, 10, 2.4))}
      {rects(throne)}
      {rects([[0, 48, W, 8, "#2b0810"], [80, 48, 40, 8, "#c8102e"], [80, 48, 40, 1, "#ffc527"]])}
      {sparkles(23, 9, "#fff6c8", [10, 4, 180, 40])}
    </>
  );
}

function DiamondArena() {
  const crystal = (cx: number, base: number, h: number, w: number): Px[] => {
    const out: Px[] = [];
    for (let y = 0; y < h; y++) {
      const half = Math.max(1, Math.round(w * (y < h * 0.3 ? y / (h * 0.3) : 1 - (y - h * 0.3) / (h * 0.9))));
      const yy = base - h + y;
      out.push([cx - half, yy, half, 1, y % 3 === 0 ? "#bff6ff" : "#5fd8f2"]);
      out.push([cx, yy, half, 1, y % 3 === 1 ? "#2ec4e6" : "#1a8fbf"]);
    }
    out.push([cx - 1, base - h + 2, 1, Math.round(h * 0.4), "#ffffff"]);
    return out;
  };
  const floor: Px[] = [];
  for (let i = 0; i < 9; i++) floor.push([0, 44 + i * (i + 1) * 0.15, W, 1, "#1fd1e855"]);
  for (let x = -100; x <= 300; x += 20) {
    for (let y = 44; y < H; y += 2) {
      const xx = 100 + (x - 100) * (0.4 + (y - 44) / 14);
      floor.push([Math.round(xx), y, 1, 2, "#1fd1e844"]);
    }
  }
  return (
    <>
      {rects(bands(["#020c16", "#04162a", "#06213a", "#082c4a"], 0, 44))}
      {stars(41, 24, ["#7fe8ff", "#ffffff"], 30)}
      {rects([[0, 44, W, 12, "#031321"]])}
      {rects(floor)}
      {rects([[0, 36, W, 2, "#0b3d5c"], [0, 38, W, 6, "#06263c"]])}
      {rects([[30, 14, 4, 24, "#0e4a6e"], [166, 14, 4, 24, "#0e4a6e"], [28, 12, 8, 3, "#5fd8f2"], [164, 12, 8, 3, "#5fd8f2"]])}
      {rects(crystal(100, 46, 34, 10))}
      {rects(crystal(78, 46, 22, 7))}
      {rects(crystal(122, 46, 24, 7))}
      {rects(crystal(58, 46, 14, 5))}
      {rects(crystal(142, 46, 15, 5))}
      {rects(crystal(14, 50, 12, 4))}
      {rects(crystal(186, 50, 13, 4))}
      <g className="bn-shine">{rects([[90, 10, 2, 34, "#ffffff66"], [94, 14, 1, 28, "#ffffff44"]])}</g>
      {sparkles(42, 10, "#e8fdff", [40, 8, 120, 34])}
    </>
  );
}

function HallOfFame() {
  const rays: Px[] = [];
  for (let i = 0; i < 7; i++) {
    const x = 100 + (i - 3) * 22;
    for (let y = 0; y < 46; y += 2) {
      const spread = 2 + Math.round(y * 0.25);
      rays.push([x - spread + Math.round((i - 3) * y * 0.4), y, spread * 2, 2, "#ffe08a"]);
    }
  }
  const column = (x: number): Px[] => [
    [x, 6, 10, 40, "#e8b83a"],
    [x + 2, 6, 2, 40, "#fff1a8"],
    [x + 7, 6, 3, 40, "#b8860b"],
    [x - 2, 3, 14, 4, "#ffd23f"],
    [x - 2, 44, 14, 4, "#ffd23f"],
  ];
  const statue = (x: number) =>
    grid(
      ["..HH..", ".HHHH.", "..HH..", ".BBBB.", "BBBBBB", "B.BB.B", "..BB..", "..BB..", ".B..B.", "PPPPPP", "PPPPPP"],
      { H: "#fff1a8", B: "#f0c040", P: "#a87a1a" },
      x,
      22,
      2,
    );
  const trophy = grid(
    ["GGGGGGGGGG", "G.YYYYYY.G", "G.YyYYYY.G", ".GYYYYYYG.", "..GYYYYG..", "...GYYG...", "....YY....", "....YY....", "..GGGGGG..", "..GYYYYG..", "..GGGGGG.."],
    { G: "#b8860b", Y: "#ffd23f", y: "#ffffff" },
    90,
    18,
    2,
  );
  return (
    <>
      {rects(bands(["#2a1606", "#3a2008", "#4a2a0a", "#5a340c"], 0, 48))}
      <g className="bn-rays" opacity={0.18}>{rects(rays)}</g>
      {rects(column(6))}
      {rects(column(184))}
      {rects(column(48))}
      {rects(column(142))}
      {rects(statue(24))}
      {rects(statue(164))}
      {rects(statue(64))}
      {rects(statue(124))}
      {rects(trophy)}
      {rects([[84, 40, 32, 8, "#a87a1a"], [84, 40, 32, 1, "#ffe08a"]])}
      {rects([[0, 48, W, 8, "#3a2008"], [70, 48, 60, 8, "#b0102a"], [70, 48, 60, 1, "#ffd23f"]])}
      {rects([[0, 0, W, 3, "#ffd23f"], [0, 3, W, 1, "#b8860b"]])}
      {sparkles(51, 12, "#fffbe0", [4, 6, 192, 40])}
    </>
  );
}


/* ---------- Gratis starter-banners ---------- */

function SunsetBeach() {
  const sun: Px[] = [];
  for (let y = -14; y <= 0; y++) for (let x = -14; x <= 14; x++) if (x * x + y * y <= 196) sun.push([100 + x, 36 + y, 1, 1, y > -4 ? "#ff5e7a" : y > -9 ? "#ff8a4c" : "#ffc04d"]);
  const sea: Px[] = [];
  const r = rng(17);
  for (let y = 37; y < 50; y += 2) {
    for (let i = 0; i < 6; i++) {
      const w = 4 + Math.floor(r() * 10);
      sea.push([Math.floor(r() * W), y, w, 1, "#ffb38a"]);
    }
  }
  const palm = grid(
    ["..LLL..LLL...", ".L...LL...L..", "L...LTTL...L.", "...L..T..L...", "......T......", "......T......", ".....T.......", ".....T.......", ".....T.......", "....T........", "....T........", "...TTT......."],
    { L: "#2a1530", T: "#2a1530" },
    150,
    18,
    2.4,
  );
  return (
    <>
      {rects(bands(["#3b1b5a", "#6a2468", "#a83a6a", "#e2566a", "#ff8a5c", "#ffb35c"], 0, 37))}
      {stars(19, 8, ["#ffe7c2"], 14)}
      {rects(sun)}
      {rects([[0, 37, W, 13, "#4a2a6a"], [0, 37, W, 1, "#ff8a5c"]])}
      <g className="bn-glow">{rects(sea)}</g>
      {rects([[0, 50, W, 6, "#f0c27a"], [0, 50, W, 1, "#ffe0a8"]])}
      {rects(palm)}
      {rects(grid(["..BB..", "BBBBBB"], { B: "#2a1530" }, 30, 34, 2), "bn-bob", { animationDuration: "3s" })}
    </>
  );
}

function NeonArcade() {
  const sun: Px[] = [];
  for (let y = -16; y <= 0; y++) {
    if (y % 3 === 0 && y > -12) continue;
    for (let x = -16; x <= 16; x++) if (x * x + y * y <= 256) sun.push([100 + x, 30 + y, 1, 1, y > -8 ? "#ff3ea5" : "#ffcf3e"]);
  }
  const city: Px[] = [];
  const r = rng(23);
  for (let x = 0; x < W; ) {
    const w = 8 + Math.floor(r() * 10);
    const h = 8 + Math.floor(r() * 16);
    if (x < 76 || x > 118 || h < 12) {
      city.push([x, 32 - h, w, h, "#120a2e"]);
      for (let wy = 32 - h + 2; wy < 30; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) if (r() > 0.55) city.push([wx, wy, 1, 1, r() > 0.5 ? "#3ef2ff" : "#ff3ea5"]);
    }
    x += w + 1;
  }
  const floor: Px[] = [];
  for (let i = 0; i < 7; i++) floor.push([0, 33 + i * (i + 2) * 0.5, W, 1, "#ff3ea5"]);
  for (let x = -200; x <= 400; x += 16) for (let y = 33; y < H; y += 1) floor.push([Math.round(100 + (x - 100) * ((y - 30) / 22)), y, 1, 1, "#3ef2ff"]);
  return (
    <>
      {rects(bands(["#0d0221", "#1b0638", "#2d0a52", "#46106a"], 0, 32))}
      {stars(29, 16, ["#ffffff", "#ffb3e6"], 18)}
      <g className="bn-glow-soft">{rects(sun)}</g>
      {rects(city)}
      {rects([[0, 32, W, 24, "#0d0221"]])}
      <g className="bn-glow">{rects(floor)}</g>
    </>
  );
}

function SnowyPeaks() {
  const mountain = (cx: number, top: number, half: number, rock: string, shade: string): Px[] => {
    const out: Px[] = [];
    const h = 50 - top;
    for (let y = 0; y < h; y++) {
      const w = Math.round((half * y) / h);
      const snow = y < h * 0.32 + (y % 3);
      out.push([cx - w, top + y, w, 1, snow ? "#ffffff" : rock], [cx, top + y, w, 1, snow ? "#d8e6f5" : shade]);
    }
    return out;
  };
  const pine = (x: number, y: number) =>
    grid(["..S..", ".SGS.", ".GGG.", "SGGGS", "GGGGG", "..T.."], { S: "#ffffff", G: "#1f5a45", T: "#4a2e1c" }, x, y, 2);
  return (
    <>
      {rects(bands(["#7ab8f5", "#94c8f8", "#b0d8fb", "#cbe6fd"], 0, 50))}
      {rects(mountain(60, 8, 50, "#6a7fa0", "#4e6284"))}
      {rects(mountain(140, 4, 56, "#7a8fb0", "#56698c"))}
      {rects(mountain(100, 18, 40, "#8a9cc0", "#62759a"))}
      {rects([[0, 46, W, 10, "#f3f8ff"], [0, 46, W, 1, "#ffffff"]])}
      {rects(pine(18, 36))}
      {rects(pine(30, 38))}
      {rects(pine(164, 37))}
      {rects(pine(178, 35))}
      <g className="bn-snow">{rects(Array.from({ length: 30 }, (_, i) => [((i * 37) % W), ((i * 23) % 50), 1, 1, "#ffffff"] as Px))}</g>
    </>
  );
}

function CherryBlossom() {
  const crown: Px[] = [];
  const r = rng(31);
  const blob = (cx: number, cy: number, rad: number) => {
    for (let y = -rad; y <= rad; y += 2) for (let x = -rad * 1.4; x <= rad * 1.4; x += 2) if ((x * x) / 1.96 + y * y <= rad * rad && r() > 0.12) crown.push([Math.round(cx + x), cy + y, 2, 2, r() > 0.6 ? "#ffd1e3" : r() > 0.3 ? "#ff9cc4" : "#ff7aae"]);
  };
  blob(60, 16, 10);
  blob(80, 12, 9);
  blob(44, 20, 7);
  blob(96, 20, 7);
  const trunk = grid(["...TT...", "..TT.T..", ".TT...T.", "..TT....", "...TT...", "...TT...", "...TT...", "..TTTT.."], { T: "#5a3426" }, 62, 22, 2.4);
  const petals = Array.from({ length: 14 }, (_, i) => (
    <rect key={i} className="bn-petal" style={{ animationDelay: `${(i * 0.53).toFixed(2)}s` }} x={30 + ((i * 41) % 160)} y={4 + ((i * 13) % 20)} width={2} height={1} fill="#ff9cc4" />
  ));
  return (
    <>
      {rects(bands(["#ffd9e8", "#ffe3ee", "#ffeef4", "#fff5f8"], 0, 44))}
      {rects(grid(["..WWWW..", ".WWWWWW.", "WWWWWWWW", "WWWWWWWW", ".WWWWWW.", "..WWWW.."], { W: "#ffffff" }, 160, 6, 1.5))}
      {rects(hills(44, 8, 70, 2.5, "#b9e3b0"))}
      {rects([[0, 48, W, 8, "#8fcf8a"], [0, 48, W, 1, "#c4ecc0"]])}
      {rects(trunk)}
      {rects(crown)}
      {rects(grid(["RRRRRRRRRRRR", "R..R....R..R", "R..R....R..R"], { R: "#d6334f" }, 128, 38, 2))}
      <g>{petals}</g>
    </>
  );
}

function DeepSea() {
  const weed = (x: number, h: number, c: string): Px[] => Array.from({ length: h }, (_, i) => [x + (i % 4 < 2 ? 0 : 1), 54 - i * 2, 2, 2, c] as Px);
  const fish = (x: number, y: number, body: string, fin: string) => grid(["F..BBB.", "FFBBBBE", "F..BBB."], { F: fin, B: body, E: "#1a1a2e" }, x, y, 2);
  return (
    <>
      {rects(bands(["#1e7fb8", "#176aa3", "#11558c", "#0c4275", "#08325e"], 0, H))}
      <g className="bn-glow-soft" opacity={0.25}>{rects([[30, 0, 6, 40, "#bfefff"], [70, 0, 4, 34, "#bfefff"], [130, 0, 7, 44, "#bfefff"], [170, 0, 3, 30, "#bfefff"]])}</g>
      {rects([[0, 50, W, 6, "#c9a86a"], [0, 50, W, 1, "#e6c98c"]])}
      {rects(weed(14, 9, "#2fae6a"))}
      {rects(weed(22, 6, "#3ec97c"))}
      {rects(weed(176, 10, "#2fae6a"))}
      {rects(weed(186, 7, "#3ec97c"))}
      {rects(grid(["..CC.C", ".CCCCC", "CCCCC."], { C: "#ff7a6a" }, 120, 44, 2))}
      <g className="bn-swim">{rects(fish(60, 20, "#ffb02a", "#ff7a2a"))}{rects(fish(100, 30, "#ffe066", "#ffb02a"))}</g>
      <g className="bn-swim" style={{ animationDelay: "-4s", animationDuration: "11s" }}>{rects(fish(40, 36, "#7fe8ff", "#2ec4e6"))}</g>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} className="bn-bubble" style={{ animationDelay: `${(i * 0.6).toFixed(2)}s` }} x={20 + i * 22} y={50} width={2} height={2} fill="#d6f6ff" />
      ))}
    </>
  );
}

const SCENES: Record<string, () => ReactNode> = {
  "sunset-beach": SunsetBeach,
  "neon-arcade": NeonArcade,
  "snowy-peaks": SnowyPeaks,
  "cherry-blossom": CherryBlossom,
  "deep-sea": DeepSea,
  "rookie-fields": RookieFields,
  "midnight-gamer": MidnightGamer,
  inferno: Inferno,
  thunderstorm: Thunderstorm,
  graveyard: Graveyard,
  "cosmic-legend": CosmicLegend,
  "dragons-lair": DragonsLair,
  "royal-champion": RoyalChampion,
  "diamond-arena": DiamondArena,
  "hall-of-fame": HallOfFame,
};

/** Een banner als achtergrond. `still` zet de animaties uit (voor kleine voorbeelden). */
export function Banner({
  id,
  className = "",
  still,
  locked,
}: {
  id: string | null | undefined;
  className?: string;
  still?: boolean;
  locked?: boolean;
}) {
  const def = bannerDef(id);
  const Scene = SCENES[def.id] ?? RookieFields;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      className={`block h-full w-full ${still ? "bn-still" : ""} ${locked ? "bn-locked" : ""} ${className}`}
      role="img"
      aria-label={`Banner: ${def.name}`}
    >
      <Scene />
    </svg>
  );
}

export function RarityChip({ rarity, className = "" }: { rarity: Rarity; className?: string }) {
  return <span className={`rarity-chip rarity-${rarity} pixel ${className}`}>{rarity.toUpperCase()}</span>;
}
