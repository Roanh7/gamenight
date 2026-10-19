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

/** Opstartgeluidje van de spelcomputer: snel omhoog en dan "pling!". */
export function playBoot() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.05;
  [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => tone(c, f, t + i * 0.06, 0.09, "square", 0.06));
  tone(c, 1046.5, t + 0.46, 0.1, "square", 0.07);
  tone(c, 2093, t + 0.58, 0.7, "square", 0.045);
  tone(c, 523.25, t + 0.58, 0.7, "triangle", 0.09);
}

/** Kort "item gevonden"-deuntje voor een nieuwe banner. */
export function playUnlock() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.05;
  [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(c, f, t + i * 0.08, 0.1, "square", 0.05));
  tone(c, 1975.53, t + 0.36, 0.4, "square", 0.04);
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

/** Underdog-zege: korte pixel-"huil" omhoog en dan een triomfantelijk loopje. */
export function playUnderdog() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime + 0.05;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(330, t);
  osc.frequency.linearRampToValueAtTime(660, t + 0.35);
  osc.frequency.linearRampToValueAtTime(587, t + 0.75);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.11, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.9);
  [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => tone(c, f, t + 0.9 + i * 0.08, 0.12, "square", 0.06));
  tone(c, 1046.5, t + 1.32, 0.5, "square", 0.05);
  tone(c, 523.25, t + 1.32, 0.5, "triangle", 0.09);
}
