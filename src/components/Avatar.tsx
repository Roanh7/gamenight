import { BG, TEXT_ON, safeColor } from "@/lib/colors";
import { frameArt } from "@/lib/frameArt";
import { safeFrame } from "@/lib/frames";
import { normalizeStyle, renderPixelCached } from "@/lib/pixelAvatar";

type Props = {
  name: string;
  color?: string | null;
  url?: string | null;
  emoji?: string | null;
  /** Pixel-personage of kant-en-klaar personage (profiles.avatar_pixel). Leeg = emoji/letter. */
  pixel?: unknown;
  /** Gekozen frame (profiles.avatar_frame) */
  frame?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  crown?: boolean;
};

const SIZES = {
  xs: { box: "h-6 w-6", round: "rounded-md", text: "text-[9px]", emoji: "text-[13px]", femoji: "text-[10px]" },
  sm: { box: "h-8 w-8", round: "rounded-lg", text: "text-[10px]", emoji: "text-[17px]", femoji: "text-[13px]" },
  md: { box: "h-10 w-10", round: "rounded-xl", text: "text-xs", emoji: "text-[21px]", femoji: "text-[16px]" },
  lg: { box: "h-14 w-14", round: "rounded-2xl", text: "text-base", emoji: "text-[30px]", femoji: "text-[23px]" },
  xl: { box: "h-20 w-20", round: "rounded-2xl", text: "text-xl", emoji: "text-[44px]", femoji: "text-[33px]" },
  hero: { box: "h-40 w-40", round: "rounded-3xl", text: "text-5xl", emoji: "text-[88px]", femoji: "text-[66px]" },
};

/** Het pixel-personage als scherpe SVG (24×24 raster). */
export function PixelArt({ style, className = "", zoom }: { style: NonNullable<ReturnType<typeof normalizeStyle>>; className?: string; zoom?: boolean }) {
  const r = renderPixelCached(style);
  return (
    <svg viewBox={zoom ? "3 2 18 18" : "0 0 24 24"} shapeRendering="crispEdges" className={`block h-full w-full ${className}`} aria-hidden>
      <rect width="24" height="24" fill={r.bg} />
      {r.paths.map((p) => (
        <path key={p.c} fill={p.c} d={p.d} />
      ))}
    </svg>
  );
}

/** Het frame als scherpe SVG over de hele avatar heen (32×32 raster). */
export function FrameArt({ id, simple }: { id: string; simple?: boolean }) {
  const f = frameArt(id, simple);
  return (
    <svg viewBox="0 0 32 32" shapeRendering="crispEdges" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      {f.base.map((p) => (
        <path key={p.c} fill={p.c} d={p.d} />
      ))}
      {f.anim.length > 0 && (
        <g className={`frame-anim fa-${f.animKind}`}>
          {f.anim.map((p) => (
            <path key={p.c} fill={p.c} d={p.d} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** Pixel-personage, profielfoto, emoji, of de eerste letter in je eigen kleur — met optioneel frame. */
export function Avatar({ name, color, url, emoji, pixel, frame, size = "md", crown }: Props) {
  const c = safeColor(color);
  const s = SIZES[size];
  const style = normalizeStyle(pixel);
  const fr = safeFrame(frame);
  const framed = fr !== "none";

  // Inhoud (zonder rand als er een frame omheen komt)
  const inner = style ? (
    <PixelArt style={style} />
  ) : url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full bg-paper object-cover" />
  ) : emoji ? (
    <span className={`${framed ? s.femoji : s.emoji} ${BG[c]} flex h-full w-full items-center justify-center leading-none`} aria-hidden>
      {emoji}
    </span>
  ) : (
    <span className={`${s.text} ${BG[c]} ${TEXT_ON[c]} font-pixel flex h-full w-full items-center justify-center uppercase`} aria-hidden>
      {name.slice(0, 1)}
    </span>
  );

  return (
    <span className={`avatar-wrap relative inline-flex shrink-0 ${crown ? "has-crown" : ""}`}>
      {framed ? (
        <span className={`${s.box} relative block`}>
          <span className="absolute overflow-hidden" style={{ inset: "12.5%" }}>
            {inner}
          </span>
          <FrameArt id={fr} simple={size === "xs"} />
        </span>
      ) : (
        <span className={`${s.box} ${s.round} block overflow-hidden border-2 border-line`}>{inner}</span>
      )}
      {crown && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[13px]" aria-label="kampioen">
          👑
        </span>
      )}
    </span>
  );
}
