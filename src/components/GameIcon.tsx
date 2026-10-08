import {
  Brain,
  CarFront,
  Crown,
  Dices,
  Gamepad2,
  Ghost,
  Joystick,
  Mic,
  Puzzle,
  Spade,
  Swords,
  Target,
  type LucideIcon,
} from "lucide-react";
import { BG, TEXT_ON, safeColor } from "@/lib/colors";

export const GAME_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  gamepad: { icon: Gamepad2, label: "Controller" },
  joystick: { icon: Joystick, label: "Arcade" },
  dice: { icon: Dices, label: "Dobbelstenen" },
  cards: { icon: Spade, label: "Kaarten" },
  car: { icon: CarFront, label: "Racen" },
  swords: { icon: Swords, label: "Vechten" },
  puzzle: { icon: Puzzle, label: "Puzzel" },
  brain: { icon: Brain, label: "Quiz" },
  mic: { icon: Mic, label: "Karaoke" },
  target: { icon: Target, label: "Mikken" },
  crown: { icon: Crown, label: "Strategie" },
  ghost: { icon: Ghost, label: "Party" },
};

const SIZES = {
  sm: { box: "h-9 w-9 rounded-lg", icon: 18 },
  md: { box: "h-12 w-12 rounded-xl", icon: 24 },
  lg: { box: "h-16 w-16 rounded-2xl", icon: 32 },
};

export function GameIcon({
  icon,
  color,
  size = "md",
}: {
  icon: string;
  color?: string | null;
  size?: keyof typeof SIZES;
}) {
  const Icon = (GAME_ICONS[icon] ?? GAME_ICONS.gamepad).icon;
  const c = safeColor(color);
  const s = SIZES[size];
  return (
    <span
      className={`${s.box} ${BG[c]} ${TEXT_ON[c]} inline-flex shrink-0 items-center justify-center border-2 border-line`}
      aria-hidden
    >
      <Icon size={s.icon} strokeWidth={2.5} />
    </span>
  );
}
