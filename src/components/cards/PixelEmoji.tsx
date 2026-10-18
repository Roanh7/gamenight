"use client";

import { useEffect, useRef } from "react";

const GB = [
  [15, 56, 15],
  [48, 98, 48],
  [139, 172, 15],
];

const BG: Record<string, string> = {
  red: "#e4002b",
  blue: "#2f5de0",
  green: "#22a04b",
  yellow: "#ffc527",
  purple: "#7b4fd6",
  orange: "#f5761a",
  pink: "#e6489b",
  teal: "#12a3a0",
};

/**
 * Tekent je emoji (of letter) op 16×16 pixels en blaast hem op: een echte pixel-avatar.
 * `gameboy` zet hem om naar de groene Game Boy-tinten.
 */
export function PixelEmoji({
  emoji,
  letter,
  color,
  gameboy,
  className,
}: {
  emoji: string | null;
  letter: string;
  color?: string | null;
  gameboy?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    const x = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !x) return;
    x.clearRect(0, 0, 16, 16);
    x.textAlign = "center";
    x.textBaseline = "middle";
    if (emoji) {
      x.font = '14px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.fillText(emoji, 8, 9);
    } else {
      x.fillStyle = gameboy ? "#306230" : (BG[color ?? ""] ?? BG.red);
      x.fillRect(1, 1, 14, 14);
      x.fillStyle = gameboy ? "#9bbc0f" : "#ffffff";
      x.font = "bold 12px sans-serif";
      x.fillText(letter.toUpperCase(), 8, 9);
    }
    const d = x.getImageData(0, 0, 16, 16);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] < 110) {
        px[i + 3] = 0;
        continue;
      }
      px[i + 3] = 255;
      if (gameboy) {
        const l = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
        const [r, g, b] = GB[l < 0.33 ? 0 : l < 0.6 ? 1 : 2];
        px[i] = r;
        px[i + 1] = g;
        px[i + 2] = b;
      } else {
        for (let j = 0; j < 3; j++) px[i + j] = Math.min(255, Math.round(px[i + j] / 64) * 64);
      }
    }
    x.putImageData(d, 0, 0);
  }, [emoji, letter, color, gameboy]);

  return <canvas ref={ref} width={16} height={16} className={`pixelated ${className ?? ""}`} aria-hidden />;
}
