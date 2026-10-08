import { BG, TEXT_ON, safeColor } from "@/lib/colors";

type Props = {
  name: string;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  crown?: boolean;
};

const SIZES = {
  xs: "h-6 w-6 text-[9px] rounded-md",
  sm: "h-8 w-8 text-[10px] rounded-lg",
  md: "h-10 w-10 text-xs rounded-xl",
  lg: "h-14 w-14 text-base rounded-2xl",
  xl: "h-20 w-20 text-xl rounded-2xl",
};

export function Avatar({ name, color, size = "md", crown }: Props) {
  const c = safeColor(color);
  return (
    <span className="relative inline-flex shrink-0">
      <span
        className={`${SIZES[size]} ${BG[c]} ${TEXT_ON[c]} font-pixel inline-flex items-center justify-center border-2 border-line uppercase`}
        aria-hidden
      >
        {name.slice(0, 1)}
      </span>
      {crown && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[13px]" aria-label="kampioen">
          👑
        </span>
      )}
    </span>
  );
}
