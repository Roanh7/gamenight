/**
 * 🏆 De gouden pixel-wisselbeker van de Smash Bros Championship Cup.
 * Alleen de REGERENDE kampioen draagt hem naast zijn naam. Vaste goudkleuren met een donkere rand,
 * zodat hij in licht en donker hetzelfde oogt.
 */
const ROWS = [
  "..##########..",
  ".#hhggggggss#.",
  "##hgggggggss##",
  "#.#hggggggs#.#",
  "#.#hgggpggs#.#",
  ".##hggggggs##.",
  "...#hggggs#...",
  "....#hggs#....",
  ".....#gs#.....",
  ".....#gs#.....",
  "....#hggs#....",
  "...#ssssss#...",
  "...########...",
];
const COLORS: Record<string, string> = { "#": "#1b1424", g: "#ffc527", h: "#fff3b0", s: "#d79a12", p: "#e4002b" };

const PATHS = (() => {
  const by: Record<string, string[]> = {};
  ROWS.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === ".") {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < row.length && row[e + 1] === c) e++;
      (by[c] ??= []).push(`M${x} ${y}h${e - x + 1}v1h-${e - x + 1}z`);
      x = e + 1;
    }
  });
  return Object.entries(by).map(([c, d]) => ({ fill: COLORS[c], d: d.join("") }));
})();

export function CupIcon({ size = 16, className = "", title = "Regerend Smash-kampioen" }: { size?: number; className?: string; title?: string | null }) {
  return (
    <svg
      viewBox="0 -0.5 14 14"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      role={title ? "img" : undefined}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {PATHS.map((p) => (
        <path key={p.fill} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}
