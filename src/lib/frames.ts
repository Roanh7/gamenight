import type { BannerStats, Condition } from "./banners";

/**
 * 🖼️ Avatar-frames — alleen cosmetisch, je draagt er één tegelijk.
 * Vrijgespeelde frames worden (net als banners) door de server bewaard in banner_unlocks, met id "frame-<id>".
 * De voorwaarden gebruiken exact dezelfde officiële cijfers als de banners (dus ook je hele geschiedenis).
 */
export type FrameDef = {
  id: string;
  name: string;
  emoji: string;
  condition: Condition;
  /** Wat je moet doen, in gewone taal (voor de slot-regel) */
  how: string;
  description: string;
};

export const FRAMES: FrameDef[] = [
  { id: "none", name: "No Frame", emoji: "⬜", condition: { kind: "default" }, how: "Heeft iedereen", description: "Gewoon je avatar, zonder rand." },
  { id: "classic", name: "Classic", emoji: "🟫", condition: { kind: "default" }, how: "Heeft iedereen", description: "Een strakke retro pixelrand." },
  { id: "blue", name: "Blue Pixel", emoji: "🟦", condition: { kind: "default" }, how: "Heeft iedereen", description: "Blauwe pixelrand." },
  { id: "green", name: "Green Pixel", emoji: "🟩", condition: { kind: "default" }, how: "Heeft iedereen", description: "Groene pixelrand." },
  { id: "inferno", name: "Inferno", emoji: "🔥", condition: { kind: "wins", n: 5 }, how: "Win 5 potjes", description: "Laaiende vlammen rondom." },
  { id: "thunder", name: "Thunder", emoji: "⚡", condition: { kind: "streak", n: 3 }, how: "Win 3 potjes op rij", description: "Knetterende bliksem." },
  { id: "dragon", name: "Dragon", emoji: "🐉", condition: { kind: "played", n: 30 }, how: "Speel 30 potjes", description: "Groene drakenschubben." },
  { id: "diamond", name: "Diamond", emoji: "💎", condition: { kind: "wins", n: 10 }, how: "Win 10 potjes", description: "Glinsterend kristal." },
  { id: "royal", name: "Royal Champion", emoji: "👑", condition: { kind: "seasons", n: 1 }, how: "Word 1 keer seizoenskampioen", description: "Koninklijk goud met juwelen." },
  { id: "cosmic", name: "Cosmic", emoji: "🌌", condition: { kind: "level", n: 10 }, how: "Bereik level 10", description: "Een ring vol sterren." },
  { id: "graveyard", name: "Graveyard", emoji: "💀", condition: { kind: "last", n: 10 }, how: "Eindig 10 keer als laatste", description: "Schedeltjes. Met liefde." },
  { id: "halloffame", name: "Hall of Fame", emoji: "🏆", condition: { kind: "seasons", n: 3 }, how: "Word 3 keer seizoenskampioen", description: "Het goud van de allergrootsten." },
];

export const FRAME_BY_ID = new Map(FRAMES.map((f) => [f.id, f]));
export const FREE_FRAMES = FRAMES.filter((f) => f.condition.kind === "default").map((f) => f.id);
export const FRAME_PREFIX = "frame-";

export const frameUnlockId = (id: string) => FRAME_PREFIX + id;
/** "frame-inferno" → "inferno" (alleen voor bekende frames) */
export function frameFromUnlock(bannerId: string) {
  if (!bannerId.startsWith(FRAME_PREFIX)) return null;
  const id = bannerId.slice(FRAME_PREFIX.length);
  return FRAME_BY_ID.has(id) && !FREE_FRAMES.includes(id) ? id : null;
}

/** Een frame-id uit de database; onbekend → geen frame. */
export function safeFrame(id: string | null | undefined) {
  return id && FRAME_BY_ID.has(id) ? id : "none";
}

export function frameProgress(def: FrameDef, s: BannerStats) {
  const c = def.condition;
  if (c.kind === "default") return { have: 1, need: 1, done: true };
  const have = s[c.kind];
  return { have: Math.min(have, c.n), need: c.n, done: have >= c.n };
}

/** Frames die iemand volgens de statistiek verdiend heeft (zonder de gratis). */
export function earnedFrames(s: BannerStats) {
  return FRAMES.filter((f) => f.condition.kind !== "default" && frameProgress(f, s).done).map((f) => f.id);
}

/** Wat er in de database moet veranderen (zelfde vorm als de banners, nooit een nieuwsbericht). */
export function frameDiff(
  users: string[],
  statsOf: (u: string) => BannerStats,
  stored: { user_id: string; banner_id: string; revoked_at: string | null }[],
) {
  const have = new Map<string, Map<string, boolean>>();
  for (const r of stored) {
    const f = frameFromUnlock(r.banner_id);
    if (!f) continue;
    const m = have.get(r.user_id) ?? new Map<string, boolean>();
    m.set(f, !r.revoked_at);
    have.set(r.user_id, m);
  }
  const grant: { user_id: string; banner_id: string; announce: false; name: string; rarity: "rare"; emoji: string }[] = [];
  const revoke: { user_id: string; banner_id: string }[] = [];
  for (const u of users) {
    const earned = new Set(earnedFrames(statsOf(u)));
    const mine = have.get(u) ?? new Map<string, boolean>();
    for (const id of earned) {
      if (mine.get(id) !== true) {
        const d = FRAME_BY_ID.get(id)!;
        grant.push({ user_id: u, banner_id: frameUnlockId(id), announce: false, name: d.name, rarity: "rare", emoji: d.emoji });
      }
    }
    for (const [id, active] of mine) if (active && !earned.has(id)) revoke.push({ user_id: u, banner_id: frameUnlockId(id) });
  }
  return { grant, revoke };
}

/** Frames die iemand nu heeft (gratis altijd). */
export function ownedFrames(rows: { user_id: string; banner_id: string; revoked_at: string | null }[], userId: string) {
  const set = new Set<string>(FREE_FRAMES);
  for (const r of rows) {
    if (r.user_id !== userId || r.revoked_at) continue;
    const f = frameFromUnlock(r.banner_id);
    if (f) set.add(f);
  }
  return set;
}

/** Nieuwe frames waarvan je de unlock-animatie nog niet zag (oudste eerst). */
export function unseenFrames(rows: { user_id: string; banner_id: string; revoked_at: string | null; seen: boolean; unlocked_at: string }[], userId: string) {
  return rows
    .filter((r) => r.user_id === userId && !r.seen && !r.revoked_at && frameFromUnlock(r.banner_id))
    .sort((a, b) => a.unlocked_at.localeCompare(b.unlocked_at))
    .map((r) => frameFromUnlock(r.banner_id)!);
}

/** "🔒 LOCKED · Speel 30 potjes · Voortgang 18/30" */
export function lockLine(def: FrameDef, s: BannerStats) {
  const p = frameProgress(def, s);
  return `🔒 LOCKED · ${def.how} · Voortgang ${p.have}/${p.need}`;
}
