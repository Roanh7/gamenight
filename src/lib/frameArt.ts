/**
 * Pixel-tekeningen van de avatar-frames op een raster van 32×32.
 * De avatar zelf zit in het midden (pixels 4 t/m 27); het frame tekent de rand van 4 pixels eromheen,
 * plus versieringen die een klein stukje over de hoeken mogen vallen.
 * "anim" = een aparte laag die zachtjes beweegt (vlammen, bliksem, sterretjes). Uit bij prefers-reduced-motion.
 */
export const FRAME_GRID = 32;
export const FRAME_INSET = 4;

type Paths = { c: string; d: string }[];
export type FrameArt = { base: Paths; anim: Paths; animKind: "flicker" | "flash" | "twinkle" | "shine" | null };

const OUT = "#1b1424";

class Grid {
  px = new Map<number, string>();
  set(x: number, y: number, c: string) {
    if (x >= 0 && x < FRAME_GRID && y >= 0 && y < FRAME_GRID) this.px.set(y * FRAME_GRID + x, c);
  }
  /** Vierkante ring op afstand i van de buitenkant. Buitenste ring met afgeknipte hoeken. */
  ring(i: number, c: string | ((x: number, y: number, side: number) => string)) {
    const a = i;
    const b = FRAME_GRID - 1 - i;
    for (let x = a; x <= b; x++) {
      for (const [y, side] of [[a, 0], [b, 2]] as const) {
        if (i === 0 && (x === a || x === b)) continue;
        this.set(x, y, typeof c === "string" ? c : c(x, y, side));
      }
    }
    for (let y = a + 1; y < b; y++) {
      for (const [x, side] of [[a, 3], [b, 1]] as const) this.set(x, y, typeof c === "string" ? c : c(x, y, side));
    }
  }
  pts(list: [number, number][], c: string) {
    for (const [x, y] of list) this.set(x, y, c);
  }
  /** Spiegel puntenlijst naar alle vier de hoeken (puntjes gedefinieerd voor linksboven). */
  corners(list: [number, number][], c: string) {
    const m = FRAME_GRID - 1;
    for (const [x, y] of list) {
      this.set(x, y, c);
      this.set(m - x, y, c);
      this.set(x, m - y, c);
      this.set(m - x, m - y, c);
    }
  }
  paths(): Paths {
    const by = new Map<string, string[]>();
    for (let y = 0; y < FRAME_GRID; y++) {
      let x = 0;
      while (x < FRAME_GRID) {
        const c = this.px.get(y * FRAME_GRID + x);
        if (!c) {
          x++;
          continue;
        }
        let e = x;
        while (e + 1 < FRAME_GRID && this.px.get(y * FRAME_GRID + e + 1) === c) e++;
        const l = by.get(c) ?? [];
        l.push(`M${x} ${y}h${e - x + 1}v1h-${e - x + 1}z`);
        by.set(c, l);
        x = e + 1;
      }
    }
    return [...by.entries()].map(([c, l]) => ({ c, d: l.join("") }));
  }
}

/** Eenvoudige ring in 3 tinten met lichte bovenkant/linkerkant. */
function basic(g: Grid, light: string, mid: string, dark: string) {
  g.ring(0, OUT);
  g.ring(1, (_x, _y, side) => (side === 0 || side === 3 ? light : mid));
  g.ring(2, mid);
  g.ring(3, (_x, _y, side) => (side === 0 || side === 3 ? dark : OUT));
}

function draw(id: string, simple: boolean): FrameArt {
  const g = new Grid();
  const a = new Grid();
  let animKind: FrameArt["animKind"] = null;
  switch (id) {
    case "classic":
      basic(g, "#e2a866", "#a96d34", "#5b3a1e");
      if (!simple) g.corners([[1, 1], [2, 2]], "#ffd23f");
      break;
    case "blue":
      basic(g, "#8fb2ff", "#2f5de0", "#1d3a99");
      if (!simple) g.ring(2, (x, y) => ((x + y) % 4 === 0 ? "#6e96f3" : "#2f5de0"));
      break;
    case "green":
      basic(g, "#7fe08f", "#22a04b", "#146a30");
      if (!simple) g.ring(2, (x, y) => ((x + y) % 4 === 0 ? "#53c56c" : "#22a04b"));
      break;
    case "inferno": {
      basic(g, "#ef7a1f", "#d6322f", "#7a1b0c");
      g.ring(2, (x, y) => ((x * 3 + y) % 5 === 0 ? "#ffb02e" : "#d6322f"));
      if (simple) break;
      // vlammen die vanaf de onderkant en de zijkanten omhoog likken (2 lagen die afwisselen)
      g.ring(1, (x, y, side) => (side === 2 ? "#ffb02e" : side === 0 ? "#a3201a" : y > 20 ? "#ef7a1f" : "#d6322f"));
      g.ring(3, (x, y, side) => (side === 2 ? "#ffd23f" : y > 18 ? "#ef7a1f" : "#7a1b0c"));
      const tongue = (x: number, h: number, c1: string, c2: string, grid: Grid) => {
        for (let k = 0; k < h; k++) grid.set(x, 27 - k, k === h - 1 ? c2 : c1);
      };
      [[5, 3], [8, 2], [11, 4], [15, 2], [19, 3], [23, 2], [26, 4]].forEach(([x, h]) => tongue(x, h, "#ef7a1f", "#ffd23f", g));
      for (const y of [12, 17, 22]) {
        g.pts([[4, y], [4, y + 1], [27, y + 1], [27, y + 2]], "#ef7a1f");
        g.pts([[4, y - 1], [27, y]], "#ffd23f");
      }
      [[6, 2], [9, 3], [13, 2], [17, 3], [21, 2], [25, 2]].forEach(([x, h]) => tongue(x, h, "#ffb02e", "#fff3b0", a));
      g.corners([[1, 1]], "#ffd23f");
      animKind = "flicker";
      break;
    }
    case "thunder": {
      basic(g, "#8a6ad6", "#4b2f8a", "#24164a");
      if (simple) break;
      g.ring(2, (x, y) => ((x + 2 * y) % 7 === 0 ? "#6b4fc0" : "#4b2f8a"));
      // bliksemschichten in de hoeken
      const bolt: [number, number][] = [[1, 4], [2, 3], [3, 2], [4, 1], [3, 4], [4, 5], [5, 4], [6, 3]];
      a.corners(bolt, "#ffe14a");
      a.corners([[2, 5], [5, 2]], "#fff7c2");
      g.corners([[4, 4]], "#ffe14a");
      animKind = "flash";
      break;
    }
    case "dragon": {
      g.ring(0, OUT);
      g.ring(1, (x, y) => ((x + y) % 2 === 0 ? "#5f9a59" : "#3d6b3a"));
      g.ring(2, (x, y) => ((x + y) % 3 === 0 ? "#284a26" : "#4d8448"));
      g.ring(3, OUT);
      if (simple) break;
      // hoorns linksboven en rechtsboven
      const horn: [number, number][] = [[3, 4], [4, 3], [4, 4], [5, 5]];
      g.pts(horn, "#efe2c2");
      g.pts(horn.map(([x, y]) => [31 - x, y] as [number, number]), "#efe2c2");
      g.pts([[15, 1], [16, 1], [15, 2], [16, 2]], "#e4002b"); // drakenoog-juweel
      g.pts([[15, 30], [16, 30]], "#ffd23f");
      break;
    }
    case "diamond": {
      g.ring(0, OUT);
      g.ring(1, (x, y) => ((x + y) % 3 === 0 ? "#ffffff" : "#9eeefc"));
      g.ring(2, (x, y) => ((x - y + 64) % 3 === 0 ? "#57c7e0" : "#7fe3f0"));
      g.ring(3, "#2a8fb0");
      if (simple) break;
      g.corners([[1, 1], [2, 2]], "#ffffff");
      // fonkelingen
      a.corners([[4, 1], [4, 2], [3, 2], [5, 2], [4, 3]], "#ffffff");
      a.pts([[16, 0], [16, 1], [15, 1], [17, 1], [16, 2]], "#ffffff");
      animKind = "twinkle";
      break;
    }
    case "royal": {
      basic(g, "#fff09a", "#ffd23f", "#a8740f");
      g.ring(2, (x, y) => ((x + y) % 5 === 0 ? "#e3ab1d" : "#ffd23f"));
      if (simple) break;
      // juwelen in het midden van elke kant en de hoeken
      g.pts([[15, 1], [16, 1], [15, 2], [16, 2]], "#e4002b");
      g.pts([[15, 29], [16, 29], [15, 30], [16, 30]], "#e4002b");
      g.pts([[1, 15], [1, 16], [2, 15], [2, 16]], "#2f5de0");
      g.pts([[29, 15], [29, 16], [30, 15], [30, 16]], "#2f5de0");
      g.corners([[1, 1], [2, 1], [1, 2], [2, 2]], "#8a4fd6");
      // kleine kroon boven in het midden, over de avatar heen
      g.pts([[13, 3], [16, 3], [18, 3], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 4], [12, 3], [19, 3]], "#ffd23f");
      g.pts([[12, 2], [15, 2], [16, 2], [19, 2]], "#ffd23f");
      g.pts([[15, 4], [16, 4]], "#e4002b");
      g.pts([[12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5]], OUT);
      a.pts([[12, 1], [19, 1], [3, 3], [28, 28]], "#fff7c2");
      animKind = "twinkle";
      break;
    }
    case "cosmic": {
      g.ring(0, OUT);
      g.ring(1, (x, y) => ((x * 7 + y * 3) % 11 === 0 ? "#ffffff" : "#2a1d63"));
      g.ring(2, (x, y) => ((x * 5 + y * 11) % 13 === 0 ? "#ffe48a" : (x + y) % 2 ? "#3b2a8a" : "#4b36a6"));
      g.ring(3, "#140d33");
      if (simple) break;
      // planeetje rechtsboven, nevel linksonder
      g.pts([[27, 1], [28, 1], [26, 2], [27, 2], [28, 2], [29, 2], [27, 3], [28, 3]], "#ef7a1f");
      g.pts([[25, 2], [30, 2]], "#ffd23f");
      g.pts([[1, 28], [2, 28], [2, 29], [3, 29], [1, 29]], "#e6489b");
      a.pts([[6, 1], [12, 2], [20, 1], [1, 8], [2, 20], [30, 12], [29, 22], [9, 30], [21, 29]], "#ffffff");
      a.pts([[6, 0], [6, 2], [5, 1], [7, 1]], "#c9c3ff");
      animKind = "twinkle";
      break;
    }
    case "graveyard": {
      g.ring(0, OUT);
      g.ring(1, (x, y) => ((x * 3 + y) % 7 === 0 ? "#5b5f69" : "#9aa0ab"));
      g.ring(2, (x, y) => ((x + y * 5) % 9 === 0 ? "#4a4e57" : "#7a7f8a"));
      g.ring(3, OUT);
      if (simple) break;
      // schedeltjes in de hoeken
      const skull: [number, number][] = [[1, 1], [2, 1], [3, 1], [1, 2], [2, 2], [3, 2], [1, 3], [3, 3]];
      g.corners(skull, "#efe8d4");
      g.corners([[1, 2], [3, 2]], OUT);
      g.corners([[2, 3]], "#c8bea2");
      g.pts([[14, 1], [15, 2], [16, 1], [30, 14], [29, 15], [30, 16]], "#4a4e57"); // barstjes
      break;
    }
    case "halloffame": {
      g.ring(0, OUT);
      g.ring(1, (_x, _y, side) => (side === 0 || side === 3 ? "#fff3b0" : "#ffd23f"));
      g.ring(2, (x, y) => ((x + y) % 2 === 0 ? "#e3ab1d" : "#ffd23f"));
      g.ring(3, "#a8740f");
      if (simple) break;
      // lauriertakjes langs de zijkanten
      for (const y of [8, 12, 16, 20, 24]) {
        g.pts([[1, y], [2, y - 1]], "#2f9a4a");
        g.pts([[30, y], [29, y - 1]], "#2f9a4a");
      }
      // ster boven, trofee-voet onder
      g.pts([[15, 0], [16, 0], [14, 1], [15, 1], [16, 1], [17, 1], [15, 2], [16, 2], [14, 3], [17, 3]], "#fff3b0");
      g.pts([[13, 29], [14, 29], [15, 29], [16, 29], [17, 29], [18, 29], [14, 30], [15, 30], [16, 30], [17, 30]], "#a8740f");
      // glans die rondgaat
      a.pts([[5, 1], [6, 1], [7, 2], [30, 6], [29, 7], [24, 30], [25, 29], [1, 24], [2, 25]], "#ffffff");
      animKind = "shine";
      break;
    }
    default:
      break;
  }
  return { base: g.paths(), anim: simple ? [] : a.paths(), animKind: simple ? null : animKind };
}

const cache = new Map<string, FrameArt>();
export function frameArt(id: string, simple = false): FrameArt {
  const key = `${id}:${simple ? 1 : 0}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = draw(id, simple);
    cache.set(key, hit);
  }
  return hit;
}
