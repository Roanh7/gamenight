"use client";

/**
 * Kleine 8-bit geluidjes, zelf opgewekt (geen bestanden).
 * iPhones spelen pas geluid af na een tik; roep daarom unlockAudio() aan in een klik-handler.
 */
let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") void c.resume();
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.08) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Overwinningsdeuntje (C-E-G-C, retro). */
export function playWin() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.05;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => tone(c, f, t + i * 0.11, 0.14));
  tone(c, 1046.5, t + 0.48, 0.45, "square", 0.07);
  tone(c, 523.25, t + 0.48, 0.45, "triangle", 0.09);
}

/** Kort "bloop" voor gelijkspel. */
export function playDraw() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.05;
  tone(c, 392, t, 0.16);
  tone(c, 392, t + 0.2, 0.3);
}

export function soundOn() {
  try {
    return localStorage.getItem("gn-sound") !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem("gn-sound", on ? "on" : "off");
  } catch {}
}
