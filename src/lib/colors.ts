import type { Color } from "./types";

// Volledige classnames zodat Tailwind ze vindt.
export const BG: Record<Color, string> = {
  red: "bg-red",
  blue: "bg-blue",
  green: "bg-green",
  yellow: "bg-yellow",
  purple: "bg-purple",
  orange: "bg-orange",
  pink: "bg-pink",
  teal: "bg-teal",
};

export const SOFT_BG: Record<Color, string> = {
  red: "bg-red-soft",
  blue: "bg-blue-soft",
  green: "bg-green-soft",
  yellow: "bg-yellow-soft",
  purple: "bg-purple-soft",
  orange: "bg-orange-soft",
  pink: "bg-pink-soft",
  teal: "bg-teal-soft",
};

export const TEXT_ON: Record<Color, string> = {
  red: "text-white",
  blue: "text-white",
  green: "text-white",
  yellow: "text-ink",
  purple: "text-white",
  orange: "text-white",
  pink: "text-white",
  teal: "text-white",
};

export const COLOR_NAME: Record<Color, string> = {
  red: "Rood",
  blue: "Blauw",
  green: "Groen",
  yellow: "Geel",
  purple: "Paars",
  orange: "Oranje",
  pink: "Roze",
  teal: "Turquoise",
};

export function safeColor(c: string | null | undefined): Color {
  return (["red", "blue", "green", "yellow", "purple", "orange", "pink", "teal"] as const).includes(
    c as Color,
  )
    ? (c as Color)
    : "red";
}
