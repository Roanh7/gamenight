export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "lg") {
    return (
      <div className="inline-flex flex-col items-center gap-3">
        <PixelController className="h-14 w-auto" />
        <div className="pixel text-center text-[22px] leading-tight">
          GAME
          <br />
          <span className="text-red">NIGHT</span>
        </div>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <PixelController className="h-6 w-auto" />
      <span className="pixel text-[11px]">
        GAME<span className="text-red">NIGHT</span>
      </span>
    </span>
  );
}

/** Kleine pixel-controller, getekend op een 16x10 raster. */
export function PixelController({ className }: { className?: string }) {
  // 1 = omtrek, 2 = body, 3 = kruis, 4 = knop rood, 5 = knop blauw
  const rows = [
    "..111111111111..",
    ".12222222222221.",
    "1222322222224221",
    "1223332222522221",
    "1222322222224221",
    "1222222222222221",
    "1222211111122221",
    ".1221......1221.",
    "..11........11..",
  ];
  const fill: Record<string, string> = {
    "1": "var(--color-ink)",
    "2": "var(--color-paper)",
    "3": "var(--color-ink)",
    "4": "var(--color-red)",
    "5": "var(--color-blue)",
  };
  return (
    <svg
      viewBox="0 0 16 9"
      className={className}
      shapeRendering="crispEdges"
      aria-hidden
    >
      {rows.flatMap((row, y) =>
        row.split("").map((c, x) =>
          c === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill[c]} />,
        ),
      )}
    </svg>
  );
}
