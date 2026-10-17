/**
 * De vormgeving van een Player Card als SVG (achtergrond, patroon, lijst, lint en avatar).
 * Dezelfde tekening wordt gebruikt op de site én in de deelbare PNG, zodat ze er hetzelfde uitzien.
 * Alle tekst komt er als HTML overheen (zie CARD_LAYOUT).
 */
import type { EditionId } from "./player";
import { avatarRects, type AvatarConfig } from "./avatar";

export const CARD_W = 160;
export const CARD_H = 224;
const NIGHT = "#1e1b2b";

type EditionArt = {
  stops: [string, string, string];
  text: string;
  accent: string;
  ribbon: string;
  icon: string;
  pattern: string;
  holo?: boolean;
  shine?: boolean;
};

export const EDITION_ART: Record<EditionId, EditionArt> = {
  standard: {
    stops: ["#fbf8f1", "#e4dccb", "#b9ae98"],
    text: NIGHT,
    accent: "#6e6879",
    ribbon: "#e4002b",
    icon: "🎮",
    pattern: `<pattern id="__P__" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#000" opacity="0.035"/></pattern>`,
  },
  gold: {
    stops: ["#fff4c2", "#ffc527", "#b87800"],
    text: NIGHT,
    accent: "#7a4e00",
    ribbon: "#ffc527",
    icon: "🏆",
    shine: true,
    pattern: `<pattern id="__P__" width="160" height="224" patternUnits="userSpaceOnUse">${sunburst(104, 62, "#fff", 0.22)}</pattern>`,
  },
  rivalry: {
    stops: ["#ff6b7d", "#e4002b", "#4a0014"],
    text: "#ffffff",
    accent: "#ffd0d7",
    ribbon: "#ff5a6e",
    icon: "⚔️",
    pattern: `<pattern id="__P__" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><rect width="3" height="14" fill="#000" opacity="0.22"/></pattern>`,
  },
  legend: {
    stops: ["#d9c2ff", "#7b4fd6", "#0e8f8c"],
    text: "#ffffff",
    accent: "#efe6ff",
    ribbon: "#c9a7ff",
    icon: "🌌",
    holo: true,
    shine: true,
    pattern: `<pattern id="__P__" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M5 1 L6 4 L9 5 L6 6 L5 9 L4 6 L1 5 L4 4 Z" fill="#fff" opacity="0.18"/></pattern>`,
  },
  underdog: {
    stops: ["#8fe8a8", "#22a04b", "#0a4420"],
    text: "#ffffff",
    accent: "#d3f7de",
    ribbon: "#7fe09c",
    icon: "🐺",
    pattern: `<pattern id="__P__" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.4" fill="#fff" opacity="0.16"/></pattern>`,
  },
  undefeated: {
    stops: ["#9cb9ff", "#2f5de0", "#0c1a5c"],
    text: "#ffffff",
    accent: "#dbe5ff",
    ribbon: "#8fb0ff",
    icon: "🛡️",
    pattern: `<pattern id="__P__" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff" opacity="0.08"/><rect x="6" y="6" width="6" height="6" fill="#fff" opacity="0.08"/></pattern>`,
  },
};

function sunburst(cx: number, cy: number, color: string, opacity: number) {
  const rays: string[] = [];
  const R = 260;
  for (let i = 0; i < 18; i++) {
    const a1 = (i * 20 * Math.PI) / 180;
    const a2 = ((i * 20 + 9) * Math.PI) / 180;
    const p = (a: number) => `${(cx + R * Math.cos(a)).toFixed(1)} ${(cy + R * Math.sin(a)).toFixed(1)}`;
    rays.push(`M${cx} ${cy} L${p(a1)} L${p(a2)} Z`);
  }
  return `<path d="${rays.join(" ")}" fill="${color}" opacity="${opacity}"/>`;
}

/** Schildvorm met een inkeping bovenaan en een punt onderaan. */
export const CARD_PATH =
  "M16 2.5 H54 L60 8 H100 L106 2.5 H144 L157.5 15 V200 L80 221.5 L2.5 200 V15 Z";

// Posities in "em" op een kaart van 16em breed (1em = 10 SVG-eenheden).
export const CARD_LAYOUT = {
  ovr: { x: 1.55, y: 2.2, size: 2.2 },
  ovrLabel: { y: 4.65, size: 0.6 },
  game: { y: 5.75, size: 1.55 },
  edition: { y: 7.75, size: 1.25 },
  avatar: { x: 4.9, y: 1.4, size: 10.1 },
  ribbon: { y: 11.5, h: 2.7 },
  name: { y: 11.82, size: 1 },
  nick: { y: 13.12, size: 0.56 },
  stats: { y: 14.85, row: 1.4, valueSize: 0.95, labelSize: 0.6, cols: [2.3, 8.9] },
  divider: { x: 8, y1: 14.8, y2: 18.75 },
  trophies: { y: 19.05, size: 0.72 },
  footer: { y: 20.15, size: 0.42 },
};

/** De tekening zelf. `avatar` mag leeg zijn (dan komt er een emoji of letter overheen). */
export function cardArtSvg(edition: EditionId, avatar: AvatarConfig | null, opts: { width?: number } = {}) {
  const a = EDITION_ART[edition];
  const L = CARD_LAYOUT;
  const id = (k: string) => `pc-${edition}-${k}`;
  const pattern = a.pattern.replace("__P__", id("p"));
  const av = L.avatar;
  const avatarRectsSvg = avatar
    ? `<svg x="${av.x * 10}" y="${av.y * 10}" width="${av.size * 10}" height="${av.size * 10}" viewBox="0 0 24 24" shape-rendering="crispEdges">${avatarRects(avatar)
        .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
        .join("")}</svg>`
    : "";
  const rb = L.ribbon;
  const w = opts.width ? ` width="${opts.width}" height="${Math.round((opts.width * CARD_H) / CARD_W)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}"${w}>
<defs>
<linearGradient id="${id("g")}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${a.stops[0]}"/><stop offset="0.5" stop-color="${a.stops[1]}"/><stop offset="1" stop-color="${a.stops[2]}"/></linearGradient>
<radialGradient id="${id("l")}" cx="0.64" cy="0.3" r="0.42"><stop offset="0" stop-color="#fff" stop-opacity="0.65"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
${pattern}
<clipPath id="${id("c")}"><path d="${CARD_PATH}"/></clipPath>
</defs>
<g clip-path="url(#${id("c")})">
<rect width="${CARD_W}" height="${CARD_H}" fill="url(#${id("g")})"/>
<rect width="${CARD_W}" height="${CARD_H}" fill="url(#${id("p")})"/>
<rect width="${CARD_W}" height="${CARD_H}" fill="url(#${id("l")})"/>
${avatarRectsSvg}
<rect x="0" y="${rb.y * 10}" width="${CARD_W}" height="${rb.h * 10}" fill="${NIGHT}"/>
<rect x="0" y="${rb.y * 10 - 2.5}" width="${CARD_W}" height="2.5" fill="${a.ribbon}"/>
<rect x="0" y="${(rb.y + rb.h) * 10}" width="${CARD_W}" height="2.5" fill="${a.ribbon}"/>
<line x1="${L.divider.x * 10}" y1="${L.divider.y1 * 10}" x2="${L.divider.x * 10}" y2="${L.divider.y2 * 10}" stroke="${a.accent}" stroke-opacity="0.55" stroke-width="1.2"/>
</g>
<path d="${CARD_PATH}" fill="none" stroke="${a.text === NIGHT ? a.accent : "#fff"}" stroke-opacity="0.45" stroke-width="1" transform="translate(80 112) scale(0.93 0.945) translate(-80 -112)"/>
<path d="${CARD_PATH}" fill="none" stroke="${NIGHT}" stroke-width="5" stroke-linejoin="round"/>
</svg>`;
}
