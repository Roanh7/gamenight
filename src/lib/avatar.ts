/**
 * Zelfgemaakte pixel-avatars: een poppetje van 24×24 pixels, opgebouwd uit lagen.
 * De keuzes worden als klein JSON-object in profiles.avatar_config bewaard.
 *
 * Tekens in de lagen: K omlijning · S huid · s huidschaduw · H haar · h haarschaduw ·
 * E oog · W wit · M mond · T rood · C kleding · c kledingschaduw · A hoofddeksel ·
 * a hoofddekselschaduw · Y goud · y goudschaduw · L glas · '.' leeg
 */

export const AVATAR_SIZE = 24;

type Layer = { y?: number; rows: string[] };

const BASE: Layer = {
  y: 4,
  rows: [
    "........KKKKKKKK........",
    ".......KSSSSSSSSK.......",
    "......KSSSSSSSSSSK......",
    "......KSSSSSSSSSSK......",
    "......KSSSSSSSSSSK......",
    ".....KKSSSSSSSSSSKK.....",
    ".....KsSSSSSSSSSSsK.....",
    ".....KsSSSSSSSSSSsK.....",
    "......KSSSSSSSSSSK......",
    "......KSSSSSSSSSSK......",
    ".......KSSSSSSSSK.......",
    ".......KsSSSSSSsK.......",
    "........KKSSSSKK........",
    "..........KssK..........",
    ".......KKKKssKKKK.......",
    ".....KKCCCCKKCCCCKK.....",
    "....KCCCCCCCCCCCCCCK....",
    "...KCCCCCCCCCCCCCCCCK...",
    "...KCcCCCCCCCCCCCCcCK...",
    "...KCcCCCCCCCCCCCCcCK...",
  ],
};

export const HAIR_STYLES: Record<string, { label: string; layer: Layer }> = {
  kort: {
    label: "Kort",
    layer: {
      y: 3,
      rows: [
        "........KKKKKKKK........",
        ".......KHHHHHHHHK.......",
        "......KHHHHHHHHHHK......",
        "......KHHhHHHHhHHK......",
        "......KHh......hHK......",
        "......KH........HK......",
      ],
    },
  },
  pony: {
    label: "Pony",
    layer: {
      y: 3,
      rows: [
        "........KKKKKKKK........",
        ".......KHHHHHHHHK.......",
        "......KHHHHHHHHHHK......",
        "......KHHHHHHHHHHK......",
        "......KHHHHHHHHHHK......",
        "......KHhHhHhHhHhK......",
      ],
    },
  },
  zijscheiding: {
    label: "Scheiding",
    layer: {
      y: 3,
      rows: [
        "........KKKKKKKK........",
        ".......KHHHHHHHHK.......",
        "......KHHHHHHHHHHK......",
        "......KHHHHHHHHhhK......",
        "......KHHHHHHh...K......",
        "......KHhhh......K......",
      ],
    },
  },
  stekels: {
    label: "Stekels",
    layer: {
      y: 0,
      rows: [
        "........................",
        "........K..K..K.........",
        ".......KHKKHKKHKK.......",
        "......KHHHHHHHHHHKK.....",
        ".....KHHHHHHHHHHHHK.....",
        "......KHHHHHHHHHHK......",
        "......KHHhHHHHhHHK......",
        "......KHh......hHK......",
        "......KH........HK......",
      ],
    },
  },
  krullen: {
    label: "Krullen",
    layer: {
      y: 1,
      rows: [
        "......KK.KKKKKK.KK......",
        ".....KHHKHHHHHHKHHK.....",
        "....KHHHHHHHHHHHHHHK....",
        "....KHHHhHHHHHHhHHHK....",
        "....KHHHHHHHHHHHHHHK....",
        "....KHHHhHHHHHHhHHHK....",
        ".....KHh........hHK.....",
        ".....KH..........HK.....",
      ],
    },
  },
  afro: {
    label: "Afro",
    layer: {
      y: 0,
      rows: [
        "........................",
        ".......KKKKKKKKKK.......",
        ".....KKHHHHHHHHHHKK.....",
        "....KHHHHHHHHHHHHHHK....",
        "...KHHHHHhHHHHhHHHHHK...",
        "...KHHHHHHHHHHHHHHHHK...",
        "...KHHHhHHHHHHHHhHHHK...",
        "...KHHH..........HHHK...",
        "...KHHH..........HHHK...",
        "....KHH..........HHK....",
      ],
    },
  },
  lang: {
    label: "Lang",
    layer: {
      y: 3,
      rows: [
        "........KKKKKKKK........",
        ".......KHHHHHHHHK.......",
        "......KHHHHHHHHHHK......",
        ".....KHHHHhHHhHHHHK.....",
        ".....KHHh......hHHK.....",
        ".....KHH........HHK.....",
        ".....KHH........HHK.....",
        ".....KHH........HHK.....",
        ".....KHH........HHK.....",
        ".....KHH........HHK.....",
        ".....KHH........HHK.....",
        ".....KHh........hHK.....",
        ".....KHh........hHK.....",
        "......KK........KK......",
      ],
    },
  },
  staart: {
    label: "Knot",
    layer: {
      y: 0,
      rows: [
        "..........KKKK..........",
        ".........KHHHHK.........",
        ".........KHhhHK.........",
        "........KKKKKKKK........",
        ".......KHHHHHHHHK.......",
        "......KHHHHHHHHHHK......",
        "......KHHhHHHHhHHK......",
        "......KHh......hHK......",
        "......KH........HK......",
      ],
    },
  },
  hanenkam: {
    label: "Hanenkam",
    layer: {
      y: 0,
      rows: [
        "..........KKKK..........",
        ".........KHHHHK.........",
        ".........KHHHHK.........",
        "........KKHhhHKK........",
        "........KSHHHHSK........",
        ".......KSSHHHHSSK.......",
        "......KSSSHhhHSSSK......",
      ],
    },
  },
  kaal: { label: "Kaal", layer: { rows: [] } },
};

export const EYE_STYLES: Record<string, { label: string; layer: Layer }> = {
  normaal: {
    label: "Normaal",
    layer: { y: 10, rows: ["........WE....WE........", "........EE....EE........"] },
  },
  groot: {
    label: "Groot",
    layer: { y: 9, rows: ["........WW....WW........", "........WE....WE........", "........EE....EE........"] },
  },
  dicht: { label: "Tevreden", layer: { y: 10, rows: ["........................", "........EE....EE........"] } },
  knipoog: {
    label: "Knipoog",
    layer: { y: 10, rows: ["........WE..............", "........EE....EE........"] },
  },
  boos: {
    label: "Boos",
    layer: {
      y: 8,
      rows: ["........E......E........", ".........E....E.........", "........WE....EW........", "........EE....EE........"],
    },
  },
  verbaasd: {
    label: "Verbaasd",
    layer: {
      y: 8,
      rows: [".........E....E.........", "........................", "........WE....WE........", "........EE....EE........"],
    },
  },
};

export const MOUTH_STYLES: Record<string, { label: string; layer: Layer }> = {
  lach: { label: "Lach", layer: { y: 14, rows: ["..........M..M..........", "...........MM..........."] } },
  grijns: { label: "Grijns", layer: { y: 14, rows: ["..........MWWM..........", "...........MM..........."] } },
  open: { label: "Open", layer: { y: 14, rows: ["...........MM...........", "...........TM..........."] } },
  scheef: { label: "Scheef", layer: { y: 13, rows: [".............M..........", "..........MMM..........."] } },
  neutraal: { label: "Strak", layer: { y: 14, rows: ["..........MMMM.........."] } },
  tong: { label: "Tong", layer: { y: 14, rows: ["..........MMMM..........", "............T..........."] } },
};

export const BEARD_STYLES: Record<string, { label: string; layer: Layer }> = {
  geen: { label: "Geen", layer: { rows: [] } },
  stoppels: {
    label: "Stoppels",
    layer: {
      y: 13,
      rows: [".......s........s.......", ".......s.s....s.s.......", "........s.s..s.s........", "..........s..s.........."],
    },
  },
  snor: { label: "Snor", layer: { y: 13, rows: ["..........hhhh..........", ".........h....h........."] } },
  sik: { label: "Sik", layer: { y: 15, rows: ["..........h..h..........", "..........hhhh.........."] } },
  baard: {
    label: "Baard",
    layer: {
      y: 12,
      rows: [
        ".......h........h.......",
        ".......hh.hhhh.hh.......",
        ".......hhh....hhh.......",
        "........hhh..hhh........",
        "..........hhhh..........",
      ],
    },
  },
};

export const HEADWEAR: Record<string, { label: string; layer: Layer; clip?: number }> = {
  geen: { label: "Geen", layer: { rows: [] } },
  pet: {
    label: "Pet",
    clip: 4,
    layer: {
      y: 2,
      rows: [
        "........KKKKKKKK........",
        ".......KAAAAAAAAK.......",
        "......KAAAAYYAAAAK......",
        "......KAAAAAAAAAAK......",
        "......KaaaaaaaaaaKKKK...",
        ".......KKKKKKKKKKAAAAK..",
        "................KKKK....",
      ],
    },
  },
  muts: {
    label: "Muts",
    clip: 4,
    layer: {
      y: 0,
      rows: [
        "...........KK...........",
        "..........KWWK..........",
        ".........KKKKKK.........",
        ".......KKAAAAAAKK.......",
        "......KAAaAAaAAaAK......",
        "......KAAaAAaAAaAK......",
        "......KWWWWWWWWWWK......",
        "......KKKKKKKKKKKK......",
      ],
    },
  },
  kroon: {
    label: "Kroon",
    clip: 3,
    layer: {
      y: 1,
      rows: [
        "......K...K..K...K......",
        "......KYK.KYYK.KYK......",
        "......KYYKYYYYKYYK......",
        "......KYYYYTYYYYYK......",
        "......KyyyyyyyyyyK......",
        "......KKKKKKKKKKKK......",
      ],
    },
  },
  zweetband: {
    label: "Zweetband",
    layer: { y: 6, rows: ["......KAAAAAAAAAAK......", "......KaaaaaaaaaaK......"] },
  },
  koptelefoon: {
    label: "Koptelefoon",
    layer: {
      y: 1,
      rows: [
        "........KKKKKKKK........",
        "......KKAAAAAAAAKK......",
        ".....KAK........KAK.....",
        ".....KAK........KAK.....",
        ".....KAK........KAK.....",
        ".....KAK........KAK.....",
        "....KAAAK......KAAAK....",
        "....KAAaK......KaAAK....",
        "....KAAaK......KaAAK....",
        "....KAAAK......KAAAK....",
        ".....KKK........KKK.....",
      ],
    },
  },
  hoed: {
    label: "Tovenaar",
    clip: 6,
    layer: {
      y: 0,
      rows: [
        "...........KK...........",
        "..........KAAK..........",
        ".........KAAAAK.........",
        "........KAAYAAAK........",
        ".......KAAAAAAAAK.......",
        "....KKKKAAAAAAAAKKKK....",
        "...KAAAAAAAAAAAAAAAAK...",
        "....KKKKKKKKKKKKKKKK....",
      ],
    },
  },
};

export const GLASSES: Record<string, { label: string; layer: Layer }> = {
  geen: { label: "Geen", layer: { rows: [] } },
  bril: {
    label: "Bril",
    layer: { y: 9, rows: [".......KKKK..KKKK.......", ".......K..KKKK..K.......", ".......K..K..K..K.......", ".......KKKK..KKKK......."] },
  },
  zonnebril: {
    label: "Zonnebril",
    layer: { y: 10, rows: ["......KKKKKKKKKKKK......", ".......KWKK..KWKK.......", "........KK....KK........"] },
  },
  pixelbril: {
    label: "Deal with it",
    layer: { y: 10, rows: ["......KKKKKKKKKKKK......", ".......KLKLK.KLKLK......", "........KLK...KLK......."] },
  },
  ski: {
    label: "Skibril",
    layer: { y: 9, rows: [".....KKKKKKKKKKKKKK.....", ".....KALLLLAALLLLAK.....", ".....KALLLLKKLLLLAK.....", ".....KKKKKKKKKKKKKK....."] },
  },
};

export const OUTFITS: Record<string, { label: string; layer: Layer }> = {
  shirt: { label: "Shirt", layer: { rows: [] } },
  hoodie: {
    label: "Hoodie",
    layer: { y: 18, rows: [".......KccKKKKccK.......", "..........W..W..........", "..........W..W.........."] },
  },
  nummer: {
    label: "Rugnummer",
    layer: { y: 20, rows: ["...........WW...........", "............W...........", "............W...........", "...........WWW.........."] },
  },
  kraag: {
    label: "Kraag",
    layer: { y: 18, rows: ["......KWWWKssKWWWK......", ".......KWWKKKKWWK.......", "........KK.CC.KK........"] },
  },
  strik: {
    label: "Strik",
    layer: { y: 19, rows: ["..........TKKT..........", "..........TTTT.........."] },
  },
  ketting: {
    label: "Ketting",
    layer: { y: 19, rows: ["........Y......Y........", ".........Y....Y.........", "..........YYYY..........", "...........yy..........."] },
  },
};

export const SKIN_TONES = ["#ffe3c4", "#f1c27d", "#e0a96d", "#c68642", "#9a6232", "#6b4024", "#8fd16a", "#a9c8ff"];
export const HAIR_COLORS = ["#1e1b2b", "#4a2e1d", "#8a4b25", "#d9a441", "#f5e08a", "#f5761a", "#e6489b", "#2f5de0", "#22a04b", "#e9e6f0"];
export const PALETTE = [
  "#e4002b",
  "#f5761a",
  "#ffc527",
  "#22a04b",
  "#12a3a0",
  "#2f5de0",
  "#7b4fd6",
  "#e6489b",
  "#1e1b2b",
  "#f6f1e7",
];

export type AvatarConfig = {
  skin: number;
  hair: string;
  hairColor: number;
  eyes: string;
  mouth: string;
  beard: string;
  head: string;
  headColor: number;
  glasses: string;
  outfit: string;
  cloth: number;
  bg: number;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  skin: 1,
  hair: "kort",
  hairColor: 1,
  eyes: "normaal",
  mouth: "lach",
  beard: "geen",
  head: "geen",
  headColor: 0,
  glasses: "geen",
  outfit: "shirt",
  cloth: 5,
  bg: 2,
};

const pickKey = (v: unknown, opts: Record<string, unknown>, d: string) =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(opts, v) ? v : d;
const pickIdx = (v: unknown, len: number, d: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v < len ? v : d;

/** Maakt van willekeurige invoer (uit de database of een formulier) een geldige avatar, of null. */
export function parseAvatar(input: unknown): AvatarConfig | null {
  let v = input;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const d = DEFAULT_AVATAR;
  return {
    skin: pickIdx(o.skin, SKIN_TONES.length, d.skin),
    hair: pickKey(o.hair, HAIR_STYLES, d.hair),
    hairColor: pickIdx(o.hairColor, HAIR_COLORS.length, d.hairColor),
    eyes: pickKey(o.eyes, EYE_STYLES, d.eyes),
    mouth: pickKey(o.mouth, MOUTH_STYLES, d.mouth),
    beard: pickKey(o.beard, BEARD_STYLES, d.beard),
    head: pickKey(o.head, HEADWEAR, d.head),
    headColor: pickIdx(o.headColor, PALETTE.length, d.headColor),
    glasses: pickKey(o.glasses, GLASSES, d.glasses),
    outfit: pickKey(o.outfit, OUTFITS, d.outfit),
    cloth: pickIdx(o.cloth, PALETTE.length, d.cloth),
    bg: pickIdx(o.bg, PALETTE.length, d.bg),
  };
}

const rand = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export function randomAvatar(): AvatarConfig {
  const bg = Math.floor(Math.random() * PALETTE.length);
  let cloth = Math.floor(Math.random() * PALETTE.length);
  if (cloth === bg) cloth = (cloth + 3) % PALETTE.length;
  return {
    skin: Math.floor(Math.random() * 6), // fantasiekleuren alleen als je ze zelf kiest
    hair: rand(Object.keys(HAIR_STYLES)),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    eyes: rand(Object.keys(EYE_STYLES)),
    mouth: rand(Object.keys(MOUTH_STYLES)),
    beard: Math.random() < 0.6 ? "geen" : rand(Object.keys(BEARD_STYLES)),
    head: Math.random() < 0.5 ? "geen" : rand(Object.keys(HEADWEAR)),
    headColor: Math.floor(Math.random() * PALETTE.length),
    glasses: Math.random() < 0.65 ? "geen" : rand(Object.keys(GLASSES)),
    outfit: rand(Object.keys(OUTFITS)),
    cloth,
    bg,
  };
}

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Donkere kleuren worden lichter "geschaduwd", anders zie je de schaduw niet. */
function shadow(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
  return lum < 60 ? "#3d3754" : shade(hex, 0.78);
}

export function avatarColors(c: AvatarConfig): Record<string, string> {
  const skin = SKIN_TONES[c.skin];
  const hair = HAIR_COLORS[c.hairColor];
  const cloth = PALETTE[c.cloth];
  const head = PALETTE[c.headColor];
  return {
    K: "#1e1b2b",
    S: skin,
    s: shade(skin, 0.84),
    H: hair,
    h: shadow(hair),
    E: "#1e1b2b",
    W: "#ffffff",
    M: "#6b1f2a",
    T: "#e4002b",
    C: cloth,
    c: shadow(cloth),
    A: head,
    a: shadow(head),
    Y: "#ffc527",
    y: "#c98a00",
    L: "#9ad0ff",
  };
}

/** Het raster (24 rijen van 24 tekens) voor een avatar. */
export function avatarGrid(c: AvatarConfig): string[][] {
  const g: string[][] = Array.from({ length: AVATAR_SIZE }, () => Array(AVATAR_SIZE).fill("."));
  const draw = (l: Layer, minY = 0) => {
    const y0 = l.y ?? 0;
    l.rows.forEach((row, i) => {
      const y = y0 + i;
      if (y < minY || y >= AVATAR_SIZE) return;
      for (let x = 0; x < AVATAR_SIZE && x < row.length; x++) {
        const ch = row[x];
        if (ch !== ".") g[y][x] = ch;
      }
    });
  };
  const hat = HEADWEAR[c.head];
  draw(BASE);
  draw(BEARD_STYLES[c.beard].layer);
  draw(MOUTH_STYLES[c.mouth].layer);
  draw(EYE_STYLES[c.eyes].layer);
  draw(HAIR_STYLES[c.hair].layer, hat.clip ?? 0);
  draw(OUTFITS[c.outfit].layer);
  draw(GLASSES[c.glasses].layer);
  draw(hat.layer);
  return g;
}

/** Rechthoeken per rij samengevoegd: weinig SVG-elementen. */
export function avatarRects(c: AvatarConfig): { x: number; y: number; w: number; fill: string }[] {
  const g = avatarGrid(c);
  const col = avatarColors(c);
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  g.forEach((row, y) => {
    let x = 0;
    while (x < AVATAR_SIZE) {
      const ch = row[x];
      if (ch === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < AVATAR_SIZE && row[x + w] === ch) w++;
      out.push({ x, y, w, fill: col[ch] ?? "#ff00ff" });
      x += w;
    }
  });
  return out;
}

/** Losse SVG-tekst (voor de deelbare kaart-afbeelding). */
export function avatarSvg(c: AvatarConfig, { background = true }: { background?: boolean } = {}): string {
  const rects = avatarRects(c)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join("");
  const bg = background ? `<rect width="24" height="24" fill="${PALETTE[c.bg]}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" shape-rendering="crispEdges">${bg}${rects}</svg>`;
}

export const AVATAR_PARTS = [
  { key: "hair", label: "Haar", icon: "💇", options: HAIR_STYLES },
  { key: "eyes", label: "Ogen", icon: "👀", options: EYE_STYLES },
  { key: "mouth", label: "Mond", icon: "👄", options: MOUTH_STYLES },
  { key: "beard", label: "Baard", icon: "🧔", options: BEARD_STYLES },
  { key: "head", label: "Hoofd", icon: "🧢", options: HEADWEAR },
  { key: "glasses", label: "Bril", icon: "🕶️", options: GLASSES },
  { key: "outfit", label: "Kleding", icon: "👕", options: OUTFITS },
] as const;
