/**
 * 🎮 Pixel Avatar — retro portretten (hoofd + schouders) op een raster van 24×24 pixels.
 * Alles wordt hier getekend, zonder plaatjes of externe diensten. De uitkomst is een handvol
 * SVG-paden (één per kleur), dus ook een lijst met veel avatars blijft licht.
 *
 * Opslag in profiles.avatar_pixel:
 *   { v: 1, k: "pixel", ... onderdelen ... }  of  { v: 1, k: "preset", id: "shadow-ninja" }
 * Onbekende of kapotte waarden vallen altijd veilig terug op een standaardwaarde.
 */

export const GRID = 24;

/* ---------------- Keuzes (wat spelers kunnen kiezen) ---------------- */

type Opt<T extends string> = { id: T; label: string };

export const SKINS = [
  { id: "s1", label: "Licht", base: "#ffdcc2", shade: "#f0b996" },
  { id: "s2", label: "Licht-midden", base: "#f5c49a", shade: "#dfa271" },
  { id: "s3", label: "Midden", base: "#dca273", shade: "#bd8152" },
  { id: "s4", label: "Getint", base: "#bd8456", shade: "#9b673d" },
  { id: "s5", label: "Bruin", base: "#93603c", shade: "#764a2b" },
  { id: "s6", label: "Donker", base: "#64402a", shade: "#4d2f1d" },
] as const;
// Alleen voor kant-en-klare personages
const SPECIAL_SKINS = {
  robot: { base: "#b9c6d8", shade: "#8796ae" },
  alien: { base: "#8fdc78", shade: "#5fb24f" },
  bone: { base: "#efe8d4", shade: "#c8bea2" },
} as const;

export const FACES: Opt<"round" | "oval" | "square" | "narrow">[] = [
  { id: "round", label: "Rond" },
  { id: "oval", label: "Ovaal" },
  { id: "square", label: "Vierkant" },
  { id: "narrow", label: "Smal" },
];

export const EYE_COLORS = [
  { id: "brown", label: "Bruin", c: "#6b3f22" },
  { id: "blue", label: "Blauw", c: "#3a7bd5" },
  { id: "green", label: "Groen", c: "#2f9a4a" },
  { id: "hazel", label: "Hazel", c: "#a0782c" },
  { id: "grey", label: "Grijs", c: "#7a8796" },
  { id: "violet", label: "Violet", c: "#8a4fd6" },
] as const;

export const EYE_SHAPES: Opt<"round" | "narrow" | "big">[] = [
  { id: "round", label: "Rond" },
  { id: "narrow", label: "Smal" },
  { id: "big", label: "Groot" },
];

export const EXPRESSIONS: Opt<"happy" | "serious" | "angry" | "confident" | "sleepy">[] = [
  { id: "happy", label: "Vrolijk" },
  { id: "serious", label: "Serieus" },
  { id: "angry", label: "Boos" },
  { id: "confident", label: "Zelfverzekerd" },
  { id: "sleepy", label: "Slaperig" },
];

export const HAIRS: Opt<"short" | "spiky" | "middle" | "curly" | "long" | "ponytail" | "buzz" | "undercut" | "wavy" | "messy" | "none">[] = [
  { id: "short", label: "Kort" },
  { id: "spiky", label: "Stekels" },
  { id: "middle", label: "Middenscheiding" },
  { id: "curly", label: "Krullen" },
  { id: "long", label: "Lang" },
  { id: "ponytail", label: "Paardenstaart" },
  { id: "buzz", label: "Buzzcut" },
  { id: "undercut", label: "Undercut" },
  { id: "wavy", label: "Golvend" },
  { id: "messy", label: "Rommelig" },
  { id: "none", label: "Kaal" },
];

export const HAIR_COLORS = [
  { id: "black", label: "Zwart", base: "#2c2433", shade: "#17111d", hi: "#4d405a" },
  { id: "darkbrown", label: "Donkerbruin", base: "#5a3621", shade: "#3c2314", hi: "#7d4c2e" },
  { id: "lightbrown", label: "Lichtbruin", base: "#9b6a3d", shade: "#77502b", hi: "#bd8a55" },
  { id: "blond", label: "Blond", base: "#efc45a", shade: "#c69735", hi: "#fbe39b" },
  { id: "red", label: "Rood", base: "#c9472c", shade: "#952f1b", hi: "#e86d46" },
  { id: "grey", label: "Grijs", base: "#9b9ba7", shade: "#73737f", hi: "#c4c4cd" },
  { id: "white", label: "Wit", base: "#ececf1", shade: "#c2c2cd", hi: "#ffffff" },
  { id: "blue", label: "Blauw", base: "#3b6ce0", shade: "#254aa8", hi: "#6e96f3" },
  { id: "purple", label: "Paars", base: "#8a4fd6", shade: "#6233a3", hi: "#ae7df1" },
] as const;

export const BEARDS: Opt<"none" | "stubble" | "mustache" | "short" | "full" | "goatee">[] = [
  { id: "none", label: "Geen" },
  { id: "stubble", label: "Stoppels" },
  { id: "mustache", label: "Snor" },
  { id: "short", label: "Korte baard" },
  { id: "full", label: "Volle baard" },
  { id: "goatee", label: "Sikje" },
];

export const OUTFITS: Opt<"tshirt" | "hoodie" | "track" | "leather" | "knight" | "ninja" | "wizard" | "gamer" | "sport" | "royal">[] = [
  { id: "tshirt", label: "T-shirt" },
  { id: "hoodie", label: "Hoodie" },
  { id: "track", label: "Trainingsjack" },
  { id: "leather", label: "Leren jas" },
  { id: "knight", label: "Ridderharnas" },
  { id: "ninja", label: "Ninja-outfit" },
  { id: "wizard", label: "Tovenaarsmantel" },
  { id: "gamer", label: "Gamingoutfit" },
  { id: "sport", label: "Sportshirt" },
  { id: "royal", label: "Koninklijk" },
];

export const OUTFIT_COLORS = [
  { id: "red", label: "Rood", c: "#d6322f" },
  { id: "blue", label: "Blauw", c: "#2f5de0" },
  { id: "green", label: "Groen", c: "#22a04b" },
  { id: "yellow", label: "Geel", c: "#f2b632" },
  { id: "purple", label: "Paars", c: "#7b4fd6" },
  { id: "black", label: "Zwart", c: "#2e2a38" },
  { id: "white", label: "Wit", c: "#e9e9ef" },
  { id: "orange", label: "Oranje", c: "#ef7a1f" },
  { id: "pink", label: "Roze", c: "#e6489b" },
  { id: "teal", label: "Turquoise", c: "#12a3a0" },
] as const;

export const ACC_EYES: Opt<"none" | "sunglasses" | "glasses">[] = [
  { id: "none", label: "Geen" },
  { id: "sunglasses", label: "Zonnebril" },
  { id: "glasses", label: "Bril" },
];
export const ACC_HEAD: Opt<"none" | "crown" | "cap" | "headband" | "headset">[] = [
  { id: "none", label: "Geen" },
  { id: "cap", label: "Pet" },
  { id: "headband", label: "Hoofdband" },
  { id: "headset", label: "Gamingheadset" },
  { id: "crown", label: "Kroon" },
];
export const ACC_FACE: Opt<"none" | "mask">[] = [
  { id: "none", label: "Geen" },
  { id: "mask", label: "Ninja-masker" },
];
export const ACC_BACK: Opt<"none" | "sword" | "wings">[] = [
  { id: "none", label: "Geen" },
  { id: "sword", label: "Zwaard op de rug" },
  { id: "wings", label: "Drakenvleugels" },
];

export const BACKGROUNDS = [
  { id: "navy", label: "Donkerblauw", c: "#22336e" },
  { id: "purple", label: "Paars", c: "#5a3693" },
  { id: "red", label: "Rood", c: "#a8293f" },
  { id: "green", label: "Groen", c: "#237a4c" },
  { id: "gold", label: "Goud", c: "#e0aa22" },
  { id: "black", label: "Zwart", c: "#191623" },
  { id: "pink", label: "Roze", c: "#d4589a" },
  { id: "teal", label: "Turquoise", c: "#169a95" },
] as const;

/* ---------------- Datastructuur ---------------- */

export type PixelStyle = {
  v: 1;
  k: "pixel";
  skin: string;
  face: string;
  eye: string; // oogkleur
  eyeShape: string;
  expr: string;
  hair: string;
  hairColor: string;
  beard: string;
  outfit: string;
  outfitColor: string;
  accEyes: string;
  accHead: string;
  accFace: string;
  accBack: string;
  bg: string;
};
export type PresetStyle = { v: 1; k: "preset"; id: string };
export type AvatarStyle = PixelStyle | PresetStyle;

export const DEFAULT_PIXEL: PixelStyle = {
  v: 1,
  k: "pixel",
  skin: "s2",
  face: "round",
  eye: "brown",
  eyeShape: "round",
  expr: "happy",
  hair: "short",
  hairColor: "darkbrown",
  beard: "none",
  outfit: "hoodie",
  outfitColor: "blue",
  accEyes: "none",
  accHead: "none",
  accFace: "none",
  accBack: "none",
  bg: "navy",
};

const pick = <T extends { id: string }>(list: readonly T[], id: unknown, fallback: string) =>
  typeof id === "string" && list.some((o) => o.id === id) ? id : fallback;

/** Maakt van iets onbekends altijd een geldige avatar (of null als het geen pixel-avatar is). */
export function normalizeStyle(raw: unknown): AvatarStyle | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.k === "preset") return typeof r.id === "string" && PRESET_BY_ID.has(r.id) ? { v: 1, k: "preset", id: r.id } : null;
  if (r.k !== "pixel") return null;
  const d = DEFAULT_PIXEL;
  return {
    v: 1,
    k: "pixel",
    skin: pick(SKINS, r.skin, d.skin),
    face: pick(FACES, r.face, d.face),
    eye: pick(EYE_COLORS, r.eye, d.eye),
    eyeShape: pick(EYE_SHAPES, r.eyeShape, d.eyeShape),
    expr: pick(EXPRESSIONS, r.expr, d.expr),
    hair: pick(HAIRS, r.hair, d.hair),
    hairColor: pick(HAIR_COLORS, r.hairColor, d.hairColor),
    beard: pick(BEARDS, r.beard, d.beard),
    outfit: pick(OUTFITS, r.outfit, d.outfit),
    outfitColor: pick(OUTFIT_COLORS, r.outfitColor, d.outfitColor),
    accEyes: pick(ACC_EYES, r.accEyes, d.accEyes),
    accHead: pick(ACC_HEAD, r.accHead, d.accHead),
    accFace: pick(ACC_FACE, r.accFace, d.accFace),
    accBack: pick(ACC_BACK, r.accBack, d.accBack),
    bg: pick(BACKGROUNDS, r.bg, d.bg),
  };
}

/** Willekeurige combinatie van bestaande onderdelen (accessoires met mate). */
export function randomStyle(rand: () => number = Math.random): PixelStyle {
  const one = <T extends { id: string }>(l: readonly T[]) => l[Math.floor(rand() * l.length)].id;
  const sometimes = <T extends { id: string }>(l: readonly T[], p: number) => (rand() < p ? one(l.slice(1)) : "none");
  return {
    v: 1,
    k: "pixel",
    skin: one(SKINS),
    face: one(FACES),
    eye: one(EYE_COLORS),
    eyeShape: one(EYE_SHAPES),
    expr: one(EXPRESSIONS),
    hair: one(HAIRS.slice(0, 10)),
    hairColor: one(HAIR_COLORS),
    beard: rand() < 0.5 ? "none" : one(BEARDS.slice(1)),
    outfit: one(OUTFITS),
    outfitColor: one(OUTFIT_COLORS),
    accEyes: sometimes(ACC_EYES, 0.25),
    accHead: sometimes(ACC_HEAD, 0.3),
    accFace: "none", // een masker verstopt bijna het hele gezicht: alleen bewust kiezen
    accBack: sometimes(ACC_BACK, 0.15),
    bg: one(BACKGROUNDS),
  };
}

/* ---------------- Kant-en-klare personages ---------------- */

/** Interne volledige beschrijving: alle keuzes + extra onderdelen die alleen presets hebben. */
type Full = Omit<PixelStyle, "v" | "k" | "skin"> & {
  skin: string; // ook "robot" | "alien" | "bone"
  special?: Partial<{
    head: "wizard-hat" | "pirate-hat" | "knight-helm" | "dragon-helm" | "ninja-hood" | "antenna";
    eyes: "visor" | "alien" | "skull" | "patch" | "glow";
    mouth: "teeth" | "grill";
    hands: "gloves";
  }>;
};

export const PRESETS: { id: string; name: string; emoji: string; full: Full }[] = [
  {
    id: "shadow-ninja",
    name: "Shadow Ninja",
    emoji: "🥷",
    full: { ...DEFAULT_PIXEL, skin: "s3", eye: "grey", eyeShape: "narrow", expr: "serious", hair: "none", outfit: "ninja", outfitColor: "red", accFace: "mask", bg: "black", special: { head: "ninja-hood" } },
  },
  {
    id: "arcane-wizard",
    name: "Arcane Wizard",
    emoji: "🧙",
    full: { ...DEFAULT_PIXEL, skin: "s1", face: "oval", eye: "violet", expr: "confident", hair: "long", hairColor: "white", beard: "full", outfit: "wizard", outfitColor: "purple", bg: "navy", special: { head: "wizard-hat" } },
  },
  {
    id: "iron-knight",
    name: "Iron Knight",
    emoji: "⚔️",
    full: { ...DEFAULT_PIXEL, skin: "s2", face: "square", eye: "blue", expr: "serious", hair: "none", outfit: "knight", outfitColor: "red", accBack: "sword", bg: "teal", special: { head: "knight-helm" } },
  },
  {
    id: "pirate-captain",
    name: "Pirate Captain",
    emoji: "🏴‍☠️",
    full: { ...DEFAULT_PIXEL, skin: "s3", face: "square", eye: "brown", expr: "confident", hair: "long", hairColor: "black", beard: "short", outfit: "leather", outfitColor: "red", bg: "navy", special: { head: "pirate-hat", eyes: "patch" } },
  },
  {
    id: "cyber-robot",
    name: "Cyber Robot",
    emoji: "🤖",
    full: { ...DEFAULT_PIXEL, skin: "robot", face: "square", eye: "blue", expr: "serious", hair: "none", outfit: "knight", outfitColor: "teal", bg: "black", special: { head: "antenna", eyes: "visor", mouth: "grill" } },
  },
  {
    id: "dragon-warrior",
    name: "Dragon Warrior",
    emoji: "🐉",
    full: { ...DEFAULT_PIXEL, skin: "s4", face: "square", eye: "hazel", eyeShape: "narrow", expr: "angry", hair: "none", beard: "stubble", hairColor: "black", outfit: "knight", outfitColor: "red", accBack: "wings", bg: "red", special: { head: "dragon-helm" } },
  },
  {
    id: "galactic-alien",
    name: "Galactic Alien",
    emoji: "👽",
    full: { ...DEFAULT_PIXEL, skin: "alien", face: "oval", eye: "green", expr: "serious", hair: "none", outfit: "track", outfitColor: "purple", bg: "black", special: { eyes: "alien", head: "antenna" } },
  },
  {
    id: "skeleton-king",
    name: "Skeleton King",
    emoji: "💀",
    full: { ...DEFAULT_PIXEL, skin: "bone", face: "narrow", expr: "serious", hair: "none", outfit: "royal", outfitColor: "purple", accHead: "crown", bg: "purple", special: { eyes: "skull", mouth: "teeth" } },
  },
  {
    id: "champion-boxer",
    name: "Champion Boxer",
    emoji: "🥊",
    full: { ...DEFAULT_PIXEL, skin: "s5", face: "square", eye: "brown", expr: "confident", hair: "buzz", hairColor: "black", outfit: "sport", outfitColor: "blue", accHead: "headband", bg: "gold", special: { hands: "gloves" } },
  },
  {
    id: "royal-king",
    name: "Royal King",
    emoji: "👑",
    full: { ...DEFAULT_PIXEL, skin: "s1", face: "oval", eye: "blue", expr: "happy", hair: "wavy", hairColor: "grey", beard: "full", outfit: "royal", outfitColor: "red", accHead: "crown", bg: "purple" },
  },
];
export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

/* ---------------- Tekenen ---------------- */

const OUT = "#1b1424"; // omlijning
const WHITE = "#ffffff";

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}
function mix(a: string, b: string, t = 0.5) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

class Canvas {
  px = new Map<number, string>();
  set(x: number, y: number, c: string) {
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) this.px.set(y * GRID + x, c);
  }
  get(x: number, y: number) {
    return this.px.get(y * GRID + x);
  }
  row(y: number, x0: number, x1: number, c: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }
  /** "y:x0-x1" of "y:x" segmenten, gescheiden door spaties */
  segs(spec: string, c: string) {
    for (const s of spec.trim().split(/\s+/)) {
      const [ys, xs] = s.split(":");
      const [a, b] = xs.split("-").map(Number);
      this.row(Number(ys), a, b ?? a, c);
    }
  }
}

/** Gezicht per rij: [y, x0, x1] */
function headRows(face: string): [number, number, number][] {
  const R = (y0: number, y1: number, a: number, b: number) => Array.from({ length: y1 - y0 + 1 }, (_, i) => [y0 + i, a, b] as [number, number, number]);
  switch (face) {
    case "oval": // langer, met een spitse kin
      return [[4, 9, 14], [5, 7, 16], ...R(6, 12, 6, 17), [13, 7, 16], [14, 7, 16], [15, 8, 15], [16, 10, 13]];
    case "square": // brede, hoekige kaak
      return [[4, 8, 15], [5, 7, 16], ...R(6, 14, 6, 17), [15, 7, 16]];
    case "narrow": // smal gezicht
      return [[4, 9, 14], [5, 8, 15], ...R(6, 12, 7, 16), [13, 8, 15], [14, 8, 15], [15, 9, 14]];
    default: // rond
      return [[4, 9, 14], [5, 7, 16], ...R(6, 12, 6, 17), [13, 7, 16], [14, 8, 15], [15, 9, 14]];
  }
}
/** Breedte van het hoofd ter hoogte van de oren */
const earX = (face: string) => (face === "narrow" ? [6, 17] : [5, 18]);

type Pal = { skin: string; skinS: string; hair: string; hairS: string; hairH: string; eye: string; cloth: string; clothS: string; clothH: string; bg: string };

function drawHairFront(cv: Canvas, style: string, p: Pal) {
  const h = p.hair;
  const S = p.hairS;
  const L = p.hairH;
  switch (style) {
    case "short":
      cv.segs("2:8-15 3:6-17 4:5-18 5:5-18 6:5-18 7:5-9 7:16-18 8:5 8:18", h);
      cv.segs("3:8-10 4:7-8", L);
      cv.segs("5:18 6:17-18 7:16-18 2:15", S);
      break;
    case "spiky":
      cv.segs("0:8 0:12 0:16 1:7-9 1:11-13 1:15-17 2:6-18 3:5-18 4:5-18 5:5-18 6:5-8 6:10-13 6:15-18 7:5-6 7:17-18 2:4 3:4 2:19", h);
      cv.segs("1:8 1:12 2:7-9 3:6-7", L);
      cv.segs("1:17 2:18 3:18 4:18 5:18 6:18 7:18 6:13", S);
      break;
    case "middle":
      cv.segs("2:8-15 3:6-17 4:5-18 5:5-10 5:13-18 6:5-9 6:14-18 7:5-7 7:16-18 8:5-6 8:17-18 9:5 9:18 10:5 10:18", h);
      cv.segs("3:7-9 4:6-8", L);
      cv.segs("3:11-12 4:11-12 5:18 6:18 7:18 8:18 9:18 10:18 5:13", S);
      break;
    case "curly": {
      cv.segs("0:9-10 0:13-14 1:7-16 2:5-18 3:4-19 4:4-19 5:4-19 6:4-19 7:4-7 7:16-19 8:4-6 8:17-19 9:4-5 9:18-19 10:4-5 10:18-19 11:4 11:19", h);
      for (let y = 0; y <= 11; y++)
        for (let x = 4; x <= 19; x++) {
          if (cv.get(x, y) !== h) continue;
          if ((x * 2 + y) % 5 === 0) cv.set(x, y, L);
          else if ((x + y * 3) % 7 === 0) cv.set(x, y, S);
        }
      break;
    }
    case "long":
      cv.segs("2:8-15 3:6-17 4:5-18 5:5-18 6:5-18 7:5-7 7:16-18 8:5-6 8:17-18", h);
      cv.segs("3:8-10 4:7-8", L);
      cv.segs("5:18 6:18 7:18 8:18 6:12-13", S);
      break;
    case "ponytail":
      cv.segs("2:8-15 3:6-17 4:5-18 5:5-18 6:5-8 6:16-18 7:5-6 7:17-18", h);
      cv.segs("3:8-10 4:7-8 5:9-11", L);
      cv.segs("5:18 6:18 7:18", S);
      break;
    case "buzz":
      cv.segs("3:9-14 4:7-16 5:6-17 6:6-17", mix(h, p.skin, 0.25));
      for (let y = 3; y <= 6; y++) for (let x = 6; x <= 17; x++) if ((x + y) % 2 === 0 && cv.get(x, y)) cv.set(x, y, h);
      cv.segs("7:6 7:17", mix(h, p.skin, 0.5));
      break;
    case "undercut":
      cv.segs("0:11-15 1:9-17 2:7-18 3:6-18 4:6-18 5:7-17 6:12-17 7:15-17", h);
      cv.segs("1:10-12 2:8-10 3:7-8", L);
      cv.segs("2:18 3:18 4:18 5:17 6:17 7:17", S);
      cv.segs("5:5-6 6:5-6 7:5-6 8:5 5:18 6:18", mix(h, p.skin, 0.55));
      break;
    case "wavy":
      cv.segs("2:8-15 3:6-17 4:5-18 5:5-18 6:5-10 6:13-18 7:5-8 7:15-18 8:5-6 8:17-18 9:5-6 9:17-18 10:5 10:18 11:5 11:18 12:5 12:18", h);
      cv.segs("3:7-9 4:6-7 5:12-14 7:15", L);
      cv.segs("4:10-11 5:6-7 6:16-17 8:18 9:18 10:18 11:18 12:18 4:15-16", S);
      break;
    case "messy":
      cv.segs("1:7 1:10-11 1:15-16 2:6-17 3:5-18 4:4-19 5:5-18 6:5-7 6:9-11 6:14-18 7:5-6 7:10 7:17-18 8:5 8:18 2:19 3:3 4:20", h);
      cv.segs("2:8-9 3:6-8 4:12-13", L);
      cv.segs("1:16 2:17 3:18 4:19 5:18 6:18 7:18 5:11", S);
      break;
    default:
      break;
  }
}

/** Haar dat achter het gezicht en over de schouders valt. */
function drawHairBack(cv: Canvas, style: string, p: Pal) {
  if (style === "long") {
    cv.segs("7:4-5 7:18-19 8:4-5 8:18-19", p.hair);
    for (let y = 9; y <= 18; y++) {
      cv.row(y, 4, 5, p.hair);
      cv.row(y, 18, 19, p.hair);
      cv.set(4, y, p.hairS);
      cv.set(19, y, p.hairS);
    }
    cv.segs("19:4-6 19:17-19", p.hairS);
  }
  if (style === "ponytail") {
    cv.segs("4:19-20 5:19-21 6:19-21 7:19-21 8:20-22 9:20-22 10:20-22 11:21-22 12:21-22 13:21", p.hair);
    cv.segs("6:21 7:21 9:22 10:22 12:22", p.hairS);
    cv.segs("5:19 6:19", "#e4002b"); // elastiekje
  }
  if (style === "wavy") {
    cv.segs("13:5 13:18 14:5 14:18", p.hairS);
  }
  if (style === "curly") {
    cv.segs("12:4-5 12:18-19 13:5 13:18", p.hair);
  }
}

function drawEyes(cv: Canvas, full: Full, p: Pal) {
  const sp = full.special?.eyes;
  const e = p.eye;
  if (sp === "visor") {
    cv.segs("9:7-16 10:7-16", "#0d2b33");
    cv.segs("9:8-15", "#4ff3ff");
    cv.segs("10:8-15", "#1ab8d0");
    cv.segs("9:9 9:14", WHITE);
    return;
  }
  if (sp === "alien") {
    cv.segs("9:7-10 9:13-16 10:7-10 10:13-16 11:8-10 11:13-15", "#121018");
    cv.segs("9:8 9:14", "#6be08b");
    return;
  }
  if (sp === "skull") {
    cv.segs("9:7-10 9:13-16 10:7-10 10:13-16", "#1a1420");
    cv.segs("10:9 10:14", "#ff3b3b");
    cv.segs("12:11-12", "#1a1420"); // neus
    return;
  }
  const shape = full.eyeShape;
  const sleepy = full.expr === "sleepy";
  const eye = (x0: number, left: boolean) => {
    const a = left ? x0 : x0 + 1; // binnenkant
    const b = left ? x0 + 1 : x0;
    if (sleepy) {
      cv.row(10, x0, x0 + 1, OUT);
      cv.row(9, x0, x0 + 1, p.skinS);
      return;
    }
    if (shape === "narrow") {
      cv.row(9, x0, x0 + 1, OUT);
      cv.set(a, 10, e);
      cv.set(b, 10, OUT);
      return;
    }
    if (shape === "big") {
      // 3 breed, met wimperlijn erboven
      const xs = left ? [x0 - 1, x0, x0 + 1] : [x0 + 2, x0 + 1, x0];
      cv.row(8, Math.min(...xs), Math.max(...xs), OUT);
      cv.set(xs[0], 9, WHITE);
      cv.set(xs[1], 9, e);
      cv.set(xs[2], 9, e);
      cv.set(xs[0], 10, e);
      cv.set(xs[1], 10, e);
      cv.set(xs[2], 10, OUT);
      return;
    }
    // rond
    cv.set(left ? x0 : x0 + 1, 9, WHITE);
    cv.set(left ? x0 + 1 : x0, 9, e);
    cv.set(a, 10, e);
    cv.set(b, 10, OUT);
  };
  if (sp === "patch") {
    eye(14, false);
    cv.segs("8:7-10 9:7-10 10:7-10 11:8-9", "#141018");
    cv.segs("7:6 8:5 6:7 5:8 7:11 6:12 5:13 4:14", "#141018"); // bandje
    return;
  }
  eye(8, true);
  eye(14, false);
}

function drawBrowsAndMouth(cv: Canvas, full: Full, p: Pal) {
  const brow = full.hair === "none" || full.hair === "buzz" ? shade(p.skin, 0.55) : p.hairS;
  const big = full.eyeShape === "big";
  const by = big ? 7 : 8;
  const sp = full.special ?? {};
  if (sp.eyes !== "visor" && sp.eyes !== "alien" && sp.eyes !== "skull") {
    switch (full.expr) {
      case "angry":
        cv.segs(`${by - 1}:7 ${by}:8-9 ${by}:14-15 ${by - 1}:16`, brow);
        break;
      case "confident":
        cv.segs(`${by - 1}:7-9 ${by}:14-16`, brow);
        break;
      case "sleepy":
        cv.segs(`${by}:7-9 ${by}:14-16`, brow);
        break;
      default:
        if (sp.eyes !== "patch") cv.segs(`${by}:7-9`, brow);
        cv.segs(`${by}:14-16`, brow);
    }
  }
  // neus
  if (sp.eyes !== "skull") cv.set(12, 11, p.skinS);
  const lip = shade(p.skin, 0.55);
  if (sp.mouth === "teeth") {
    cv.segs("14:9-14", "#1a1420");
    cv.segs("13:9 13:11 13:13", WHITE);
    cv.segs("13:10 13:12 13:14", "#d9d0b8");
    return;
  }
  if (sp.mouth === "grill") {
    cv.segs("13:9-14", "#2a3442");
    cv.segs("13:10 13:12 13:14", "#55e6ff");
    return;
  }
  switch (full.expr) {
    case "happy":
      cv.segs("12:9 12:14", lip);
      cv.segs("13:10-13", OUT);
      cv.segs("13:11-12", "#c2364a");
      break;
    case "angry":
      cv.segs("13:10-13 14:9 14:14", OUT);
      break;
    case "confident":
      cv.segs("13:10-12 12:13", OUT);
      break;
    case "sleepy":
      cv.segs("13:11-12", lip);
      break;
    default:
      cv.segs("13:10-13", lip);
  }
}

function drawBeard(cv: Canvas, beard: string, face: string, p: Pal) {
  if (beard === "none") return;
  const rows = headRows(face).filter(([y]) => y >= 11);
  const b = p.hair;
  const bS = p.hairS;
  if (beard === "stubble") {
    const c = mix(p.skin, p.hair, 0.45);
    for (const [y, a, z] of rows) for (let x = a; x <= z; x++) if (y >= 12 && (x + y) % 2 === 0 && !(y === 13 && x >= 10 && x <= 13)) cv.set(x, y, c);
    return;
  }
  if (beard === "mustache") {
    cv.segs("12:9-14", b);
    cv.segs("12:9 12:14", bS);
    return;
  }
  if (beard === "goatee") {
    cv.segs("12:10-13", b);
    const last = rows[rows.length - 1][0];
    cv.segs(`${last - 1}:10-13 ${last}:10-13 ${last + 1}:11-12`, b);
    cv.segs(`${last + 1}:11-12`, bS);
    return;
  }
  // kort of vol: kaaklijn (+ hele onderkant bij vol), mond blijft vrij
  for (const [y, a, z] of rows) {
    if (beard === "short") {
      if (y >= 12) {
        cv.set(a, y, b);
        cv.set(z, y, b);
      }
      if (y === rows[rows.length - 1][0] || y === rows[rows.length - 2][0]) cv.row(y, a, z, b);
    } else if (y >= 12) cv.row(y, a, z, b);
  }
  cv.segs("12:9-14", b);
  const last = rows[rows.length - 1][0];
  if (beard === "full") {
    cv.segs(`${last + 1}:9-14 ${last + 2}:10-13`, b);
    cv.segs(`${last + 2}:10-13 ${last + 1}:14`, bS);
    for (const [y, , z] of rows) if (y >= 12) cv.set(z, y, bS);
  }
  cv.segs("13:10-13", "#3a1d1d"); // mond
  cv.segs("13:11-12", "#c2364a");
}

function drawOutfit(cv: Canvas, outfit: string, p: Pal) {
  const c = p.cloth;
  const S = p.clothS;
  const H = p.clothH;
  const body = () => {
    cv.segs("17:7-16 18:4-19 19:3-20 20:2-21 21:2-21 22:2-21 23:2-21", c);
    cv.segs("18:19 19:19-20 20:20-21 21:20-21 22:20-21 23:20-21", S);
    cv.segs("19:4 20:3 21:3", H);
  };
  switch (outfit) {
    case "tshirt":
      body();
      cv.segs("17:9 17:14 18:10-13", S);
      cv.segs("21:6 22:6 21:17 22:17", S);
      break;
    case "hoodie":
      body();
      cv.segs("16:7-9 16:14-16 17:7-9 17:14-16", S); // capuchon
      cv.segs("18:9-14", S);
      cv.segs("19:10 20:10 19:13 20:13", WHITE); // koordjes
      cv.segs("22:7-16", S); // buidelzak
      cv.segs("23:7 23:16", S);
      break;
    case "track":
      body();
      cv.segs("17:8-15", c);
      cv.segs("17:8 17:15", S);
      for (let y = 18; y <= 23; y++) cv.set(11, y, "#e8e8ef");
      cv.segs("18:12 19:12 20:12 21:12 22:12 23:12", S);
      cv.segs("19:5 20:4 21:4 22:4 23:4 19:18 20:19 21:19 22:19 23:19", WHITE);
      break;
    case "leather":
      body();
      cv.segs("17:10-13 18:10-13 19:10-13 20:11-12 21:11-12", "#e9e4dc"); // shirt eronder
      cv.segs("18:9 19:9 20:10 21:10 22:10 18:14 19:14 20:13 21:13 22:13", S); // revers
      cv.segs("18:8 19:8 18:15 19:15", H);
      cv.segs("22:14 23:14", "#c9ccd4"); // rits
      break;
    case "knight": {
      const m = "#c4ccd8";
      const mS = "#8d97a8";
      const mH = "#eef2f8";
      cv.segs("17:7-16 18:4-19 19:3-20 20:2-21 21:2-21 22:2-21 23:2-21", m);
      cv.segs("18:4-7 18:16-19 19:3-6 19:17-20 20:2-5 20:18-21", mH); // schouderstukken
      cv.segs("21:2-5 21:18-21", mS);
      cv.segs("19:19-20 20:20-21 22:20-21 23:20-21 17:16", mS);
      cv.segs("17:9-14", mS); // kraag
      cv.segs("19:10-13 20:10-13 21:10-13 22:10-13 23:10-13", c); // wapenkleed
      cv.segs("19:13 20:13 21:13 22:13 23:13", S);
      cv.segs("21:11-12 20:11 22:11", "#ffd23f");
      break;
    }
    case "ninja":
      cv.segs("17:7-16 18:4-19 19:3-20 20:2-21 21:2-21 22:2-21 23:2-21", "#2a2633");
      cv.segs("18:8 19:9 20:10 21:11 22:12 23:13 18:15 19:14 20:13", "#3e3a4a"); // overslag
      cv.segs("18:19 19:19-20 20:20-21 21:20-21 22:20-21 23:20-21", "#1d1a24");
      cv.segs("22:2-21", c); // band
      cv.segs("23:2-21", S);
      cv.segs("22:6 23:5", H);
      break;
    case "wizard":
      body();
      cv.segs("17:9 18:9 19:10 20:10 21:11 17:14 18:14 19:13 20:13 21:12", "#ffd23f"); // gouden rand
      cv.segs("18:10-13 19:11-12 20:11-12", shade(c, 0.6));
      cv.segs("20:5 22:7 21:17 23:15 19:18", "#ffe48a"); // sterren
      break;
    case "gamer":
      body();
      cv.segs("17:9 17:14 18:10-13", S);
      cv.segs("20:8-15 21:8-15 22:9 22:14", "#f4f4f8"); // controller
      cv.segs("21:9 20:9 21:10", "#2b2733");
      cv.segs("20:14 21:13", "#e4002b");
      cv.segs("20:13", "#2f5de0");
      break;
    case "sport":
      body();
      cv.segs("17:10-13", "#ffffff");
      cv.segs("18:11-12", "#ffffff");
      cv.segs("20:2-21", "#ffffff");
      cv.segs("21:2-21", S);
      cv.segs("18:5 19:4 18:18 19:19", "#ffffff");
      break;
    case "royal":
      body();
      cv.segs("17:7-16 18:4-19 19:4-19", "#f4f1ea"); // hermelijn
      cv.segs("18:6 18:10 18:14 18:18 19:8 19:12 19:16", "#1b1424");
      cv.segs("19:3 19:20", S);
      cv.segs("20:11-12 21:11-12", "#ffd23f");
      cv.segs("21:11", "#d1342f");
      cv.segs("20:10 20:13", "#e3ab1d");
      break;
    default:
      body();
  }
}

function drawAccessories(cv: Canvas, full: Full, p: Pal, stage: "back" | "front") {
  const sp = full.special ?? {};
  if (stage === "back") {
    if (full.accBack === "wings") {
      const w = "#7a2436";
      const wl = "#b8394f";
      cv.segs("9:0 10:0-1 11:0-2 12:0-3 13:1-4 14:1-4 15:2-4 16:2-4 17:3-4", w);
      cv.segs("9:23 10:22-23 11:21-23 12:20-23 13:19-22 14:19-22 15:19-21 16:19-21 17:19-20", w);
      cv.segs("11:1 12:1-2 13:2-3 14:3 11:22 12:21-22 13:20-21 14:20", wl);
    }
    if (full.accBack === "sword") {
      // schuin over de rug: gevest boven de rechterschouder, punt onder de linkerkant
      for (let i = 0; i <= 13; i++) {
        const x = 17 - i;
        const y = 6 + Math.round((i * 11) / 13);
        cv.set(x, y, "#dfe6ef");
        cv.set(x + 1, y, "#9aa4b4");
      }
      cv.segs("3:15 4:16 5:17 6:18 7:19", "#e3ab1d"); // pareerstang
      cv.segs("4:19 3:20 4:20 3:19", "#6b4027"); // greep
      cv.segs("2:21 1:21 2:22", "#ffd23f"); // knop
    }
    return;
  }
  // gezicht
  if (full.accFace === "mask") {
    const rows = headRows(full.face).filter(([y]) => y >= 11);
    for (const [y, a, z] of rows) cv.row(y, a, z, "#262335");
    const [el, er] = earX(full.face);
    cv.segs(`11:${el} 11:${er}`, "#262335");
    for (const [y, a, z] of rows) if (y === 11) cv.row(y, a + 1, z - 1, "#45405c"); // stofrand
    cv.segs("13:10-12 14:11", "#1a1826"); // plooien
  }
  // ogen
  if (full.accEyes === "sunglasses") {
    cv.segs("9:7-10 9:13-16 10:7-10 10:13-16", "#14111c");
    cv.segs("9:11-12", "#14111c");
    cv.segs("9:8 9:14", "#6c7ea8");
  }
  if (full.accEyes === "glasses") {
    const f = "#2b2733";
    cv.segs("8:7-10 8:13-16 9:7 9:10 10:7 10:10 11:7-10 9:13 9:16 10:13 10:16 11:13-16 9:11-12", f);
    cv.segs("9:5-6 9:17-18", f);
  }
  // hoofd (gewone accessoires)
  if (full.accHead === "cap") {
    const c = p.cloth;
    cv.segs("1:9-14 2:7-16 3:6-17 4:6-17 5:5-18", c);
    cv.segs("2:16 3:17 4:17", p.clothS);
    cv.segs("2:9-10 3:8", p.clothH);
    cv.segs("5:2-10", p.clothS); // klep
    cv.segs("6:2-8", OUT);
    cv.segs("3:12", WHITE);
  }
  if (full.accHead === "headband") {
    cv.segs("6:5-18", "#e4002b");
    cv.segs("6:17-18", "#a3001f");
    cv.segs("6:19 7:20 8:20 7:19", "#e4002b");
  }
  if (full.accHead === "headset") {
    cv.segs("1:9-14 2:7-8 2:15-16 3:6 3:17 4:5 4:18", "#2b2733");
    cv.segs("5:4 5:19 6:4 6:19 7:4 7:19", "#2b2733");
    cv.segs("8:3-5 9:3-5 10:3-5 11:3-5 8:18-20 9:18-20 10:18-20 11:18-20", "#3a3646");
    cv.segs("9:4 10:4 9:19 10:19", p.cloth);
    cv.segs("12:5 13:6 13:7 13:8", "#2b2733"); // microfoon
    cv.segs("13:9", "#e4002b");
  }
  if (full.accHead === "crown") {
    const g = "#ffd23f";
    const gS = "#d79a12";
    cv.segs("0:7 0:11-12 0:16 1:7-8 1:11-12 1:15-16 2:7-16 3:7-16", g);
    cv.segs("3:7-16", gS);
    cv.segs("2:9 2:14", "#e4002b");
    cv.segs("2:11-12", "#2f9ae0");
    cv.segs("1:7 0:11", "#fff3b0");
  }
  // speciaal (alleen kant-en-klare personages)
  if (sp.head === "ninja-hood") {
    const h = "#2a2633";
    for (const [y, a, z] of headRows(full.face)) if (y < 9 || y > 10) cv.row(y, a, z, h);
    cv.segs("3:9-14 4:7-16 9:6 10:6 9:17 10:17 5:6-17", h);
    cv.segs("4:9-11 5:7-8", "#3e3a4a");
    cv.segs("6:18 7:19 8:19 7:20", "#e4002b"); // knoop
  }
  if (sp.head === "wizard-hat") {
    const c = "#5b34a6";
    const cS = "#3e2278";
    cv.segs("0:14-15 1:13-15 2:12-15 3:11-15 4:10-15 5:9-16 6:4-19", c);
    cv.segs("0:15 1:15 2:15 3:15 4:15 5:16 6:18-19", cS);
    cv.segs("6:4-19", cS);
    cv.segs("5:9-16", "#ffd23f");
    cv.segs("2:13 4:11", "#ffe48a");
  }
  if (sp.head === "pirate-hat") {
    const c = "#1f1b26";
    cv.segs("0:9-14 1:7-16 2:6-17 3:6-17 4:3-20 5:2-21 6:4-19", c);
    cv.segs("2:11-12 3:10-13", WHITE); // doodshoofd
    cv.segs("3:11 3:12", c);
    cv.segs("4:3-20", "#ffd23f");
  }
  if (sp.head === "knight-helm") {
    const m = "#c4ccd8";
    const mS = "#8d97a8";
    const mH = "#eef2f8";
    for (const [y, a, z] of headRows(full.face)) cv.row(y, a - (y >= 6 && y <= 12 ? 1 : 0), z + (y >= 6 && y <= 12 ? 1 : 0), m);
    cv.segs("3:9-14 4:7-16", m);
    cv.segs("9:7-16", "#1b1424"); // vizier
    cv.segs("10:8 10:10 10:13 10:15", "#3a4352");
    cv.segs("4:9-11 5:7-8 6:6 7:6", mH);
    cv.segs("6:18 7:18 8:18 11:18 12:18 13:16 14:15", mS);
    cv.segs("12:11 13:11 14:11", mS);
    cv.segs("1:11-12 2:11-12 3:11-12", "#d6322f"); // pluim
    cv.segs("0:12-14", "#d6322f");
  }
  if (sp.head === "dragon-helm") {
    const m = "#3d6b3a";
    const mS = "#284a26";
    const mH = "#5f9a59";
    for (const [y, a, z] of headRows(full.face)) if (y <= 8) cv.row(y, a - 1, z + 1, m);
    cv.segs("3:9-14 9:5 10:5 11:5 9:18 10:18 11:18", m);
    cv.segs("4:9 5:8 6:7 5:13 6:12 4:15", mH); // schubben
    cv.segs("8:6-17", mS);
    cv.segs("0:4 1:4-5 2:5-6 3:6-7 0:19 1:18-19 2:17-18 3:16-17", "#efe2c2"); // hoorns
    cv.segs("8:11-12", "#e4002b");
  }
  if (sp.head === "antenna") {
    cv.segs("1:11 2:11 3:11", "#8796ae");
    cv.segs("0:10-12", sp.eyes === "alien" ? "#b6ff8a" : "#ff4f6a");
  }
  if (sp.hands === "gloves") {
    const g = "#d6322f";
    const gS = "#9e1f1d";
    cv.segs("18:0-3 19:0-4 20:0-4 21:0-4 22:0-4 23:1-3", g);
    cv.segs("18:20-23 19:19-23 20:19-23 21:19-23 22:19-23 23:20-22", g);
    cv.segs("21:4 22:4 23:3 21:23 22:23 23:22", gS);
    cv.segs("19:1 20:1 19:20 20:20", "#ff6f6a");
    cv.segs("22:0-4 22:19-23", WHITE);
  }
}

/** Omlijning rond het hele personage (lege pixels naast een gekleurde pixel). */
function outline(cv: Canvas) {
  const add: number[] = [];
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (cv.get(x, y)) continue;
      if (cv.get(x - 1, y) || cv.get(x + 1, y) || cv.get(x, y - 1) || cv.get(x, y + 1)) add.push(y * GRID + x);
    }
  for (const k of add) cv.px.set(k, OUT);
}

function fullOf(style: AvatarStyle): Full {
  if (style.k === "preset") return PRESET_BY_ID.get(style.id)?.full ?? { ...DEFAULT_PIXEL };
  return style;
}

/** Tekent een avatar en geeft per kleur één SVG-pad terug. */
export function renderPixel(style: AvatarStyle): { bg: string; paths: { c: string; d: string }[] } {
  const full = fullOf(style);
  const skin =
    (SPECIAL_SKINS as Record<string, { base: string; shade: string }>)[full.skin] ?? SKINS.find((s) => s.id === full.skin) ?? SKINS[1];
  const hair = HAIR_COLORS.find((h) => h.id === full.hairColor) ?? HAIR_COLORS[1];
  const cloth = (OUTFIT_COLORS.find((o) => o.id === full.outfitColor) ?? OUTFIT_COLORS[1]).c;
  const p: Pal = {
    skin: skin.base,
    skinS: skin.shade,
    hair: hair.base,
    hairS: hair.shade,
    hairH: hair.hi,
    eye: (EYE_COLORS.find((e) => e.id === full.eye) ?? EYE_COLORS[0]).c,
    cloth,
    clothS: shade(cloth, 0.72),
    clothH: shade(cloth, 1.18),
    bg: (BACKGROUNDS.find((b) => b.id === full.bg) ?? BACKGROUNDS[0]).c,
  };

  const cv = new Canvas();
  drawAccessories(cv, full, p, "back");
  drawOutfit(cv, full.outfit, p);
  drawHairBack(cv, full.hair, p);
  // nek
  cv.segs("15:10-13 16:10-13 17:10-13", p.skinS);
  if (full.outfit === "tshirt" || full.outfit === "gamer" || full.outfit === "sport") cv.segs("17:10-13", p.skinS);
  // hoofd + oren
  for (const [y, a, z] of headRows(full.face)) {
    cv.row(y, a, z, p.skin);
    cv.set(z, y, p.skinS);
  }
  const [el, er] = earX(full.face);
  for (const y of [9, 10, 11]) {
    cv.set(el, y, p.skin);
    cv.set(er, y, y === 9 ? p.skin : p.skinS);
  }
  cv.set(el, 10, p.skinS);
  if (full.skin === "robot") cv.segs("6:6-17 12:6-17", p.skinS); // naden
  drawBeard(cv, full.beard, full.face, p);
  drawEyes(cv, full, p);
  drawBrowsAndMouth(cv, full, p);
  if (full.beard === "full" || full.beard === "short") {
    // mond in de baard opnieuw (wenkbrauwen/mond tekenen kan hem overschreven hebben)
    cv.segs("13:10-13", "#3a1d1d");
    cv.segs("13:11-12", "#c2364a");
  }
  drawHairFront(cv, full.hair, p);
  drawAccessories(cv, full, p, "front");
  outline(cv);

  // per kleur samenvoegen tot rijen ("runs")
  const byColor = new Map<string, string[]>();
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      const c = cv.get(x, y);
      if (!c) {
        x++;
        continue;
      }
      let e = x;
      while (e + 1 < GRID && cv.get(e + 1, y) === c) e++;
      const list = byColor.get(c) ?? [];
      list.push(`M${x} ${y}h${e - x + 1}v1h-${e - x + 1}z`);
      byColor.set(c, list);
      x = e + 1;
    }
  }
  return { bg: p.bg, paths: [...byColor.entries()].map(([c, l]) => ({ c, d: l.join("") })) };
}

/* Kleine cache: dezelfde avatar wordt op een pagina vaak meerdere keren getekend */
const cache = new Map<string, ReturnType<typeof renderPixel>>();
export function renderPixelCached(style: AvatarStyle) {
  const key = JSON.stringify(style);
  let hit = cache.get(key);
  if (!hit) {
    hit = renderPixel(style);
    if (cache.size > 300) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}
