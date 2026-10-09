"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playDraw, playWin, setSound, soundOn, unlockAudio } from "@/lib/sfx";

const COLORS = ["#e4002b", "#2f5de0", "#22a04b", "#ffc527", "#7b4fd6", "#f5761a", "#e6489b", "#12a3a0"];

/** Pixel-confetti over het scherm + (optioneel) een deuntje. */
export function Celebrate({ kind = "win", sound = true }: { kind?: "win" | "draw"; sound?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sound && soundOn()) (kind === "win" ? playWin : playDraw)();
    if (kind !== "win") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = window.innerWidth * dpr);
    const h = (canvas.height = window.innerHeight * dpr);
    const g = canvas.getContext("2d")!;
    const size = 7 * dpr;
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (-Math.random() * 16 - 6) * dpr,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      g.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.45 * dpr;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(Math.round(p.r / (Math.PI / 4)) * (Math.PI / 4)); // "pixel"-hoeken
        g.fillStyle = p.c;
        g.fillRect(-size / 2, -size / 2, size, size * 0.6);
        g.restore();
      }
      if (frame < 220) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, sound]);

  if (done || kind !== "win") return null;
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50 h-full w-full" aria-hidden />;
}

/** Knopje om geluid aan/uit te zetten (onthouden per telefoon). */
export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- instelling staat op het toestel
    setOn(soundOn());
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        unlockAudio();
        setSound(!on);
        setOn(!on);
        if (!on) playWin();
      }}
      className="btn btn-secondary btn-sm"
      aria-pressed={on}
    >
      {on ? <Volume2 size={16} strokeWidth={2.5} /> : <VolumeX size={16} strokeWidth={2.5} />}
      {on ? "Geluid aan" : "Geluid uit"}
    </button>
  );
}
