import { avatarRects, PALETTE, type AvatarConfig } from "@/lib/avatar";

/** Zelfgemaakte pixel-avatar als scherpe SVG (schaalt naar elke maat). */
export function PixelAvatar({
  config,
  background = true,
  className,
  viewBox = "0 0 24 24",
}: {
  config: AvatarConfig;
  background?: boolean;
  className?: string;
  /** Uitsnede, bijv. alleen het gezicht */
  viewBox?: string;
}) {
  return (
    <svg viewBox={viewBox} shapeRendering="crispEdges" className={className} aria-hidden>
      {background && <rect width="24" height="24" fill={PALETTE[config.bg]} />}
      {avatarRects(config).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />
      ))}
    </svg>
  );
}
