import { BG, TEXT_ON, safeColor } from "@/lib/colors";

type Props = {
  name: string;
  color?: string | null;
  url?: string | null;
  emoji?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  crown?: boolean;
};

const SIZES = {
  xs: { box: "h-6 w-6 rounded-md", text: "text-[9px]", emoji: "text-[13px]" },
  sm: { box: "h-8 w-8 rounded-lg", text: "text-[10px]", emoji: "text-[17px]" },
  md: { box: "h-10 w-10 rounded-xl", text: "text-xs", emoji: "text-[21px]" },
  lg: { box: "h-14 w-14 rounded-2xl", text: "text-base", emoji: "text-[30px]" },
  xl: { box: "h-20 w-20 rounded-2xl", text: "text-xl", emoji: "text-[44px]" },
};

/** Profielfoto, emoji, of de eerste letter in je eigen kleur. */
export function Avatar({ name, color, url, emoji, size = "md", crown }: Props) {
  const c = safeColor(color);
  const s = SIZES[size];
  return (
    <span className="relative inline-flex shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`${s.box} border-2 border-line bg-paper object-cover`}
        />
      ) : emoji ? (
        <span
          className={`${s.box} ${s.emoji} ${BG[c]} inline-flex items-center justify-center border-2 border-line leading-none`}
          aria-hidden
        >
          {emoji}
        </span>
      ) : (
        <span
          className={`${s.box} ${s.text} ${BG[c]} ${TEXT_ON[c]} font-pixel inline-flex items-center justify-center border-2 border-line uppercase`}
          aria-hidden
        >
          {name.slice(0, 1)}
        </span>
      )}
      {crown && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[13px]" aria-label="kampioen">
          👑
        </span>
      )}
    </span>
  );
}
