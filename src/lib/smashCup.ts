
/**
 * 🏆 Smash Bros Championship Cup — de digitale wisselbeker.
 * Alle uitslagen staan in public.smash_cups (ook historische, van vóór de app).
 * De REGERENDE kampioen = winnaar van de nieuwste uitslag (op datum). Alles hieronder wordt daaruit berekend;
 * er bestaat geen losse "huidige kampioen" die uit de pas kan lopen.
 * Staat helemaal los van competitiepunten, XP en achievements.
 */

export type CupRow = {
  id: string;
  night_id: string | null;
  held_on: string; // YYYY-MM-DD
  winner_id: string;
  is_historic: boolean;
  note: string | null;
  confirmed_at: string;
};

export type CupEdition = CupRow & {
  /** 1 = de oudste bekende editie */
  edition: number;
  /** Zelfde winnaar als de editie ervoor */
  defended: boolean;
  /** Winnaar van de editie ervoor (null bij de eerste) */
  previous: string | null;
};

export type PlayerCupStats = {
  user_id: string;
  cups: number;
  defenses: number;
  /** Langste reeks bekers op rij */
  streak: number;
  lastYear: number;
  firstYear: number;
};

export type CupStats = {
  editions: CupEdition[]; // oud → nieuw
  champion: string | null;
  /** Sinds wanneer de huidige kampioen de beker onafgebroken heeft (eerste zege van de huidige reeks) */
  championSince: string | null;
  players: Map<string, PlayerCupStats>;
  mostCups: PlayerCupStats[];
  longestStreak: PlayerCupStats[];
  mostDefenses: PlayerCupStats[];
  /** Langst regerend: van eerste zege tot de editie waarop een ander won (of vandaag) */
  longestReign: { user_id: string; days: number; from: string; to: string | null }[];
};

export const isSmashGame = (name: string | null | undefined) => /smash/i.test(name ?? "");

export const cupOrder = (a: CupRow, b: CupRow) => a.held_on.localeCompare(b.held_on) || a.confirmed_at.localeCompare(b.confirmed_at);

const DAY = 86_400_000;
const dayNum = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / DAY;

/** Alle berekeningen uit de lijst met uitslagen. `today` = YYYY-MM-DD (Amsterdam). */
export function cupStats(rows: CupRow[], today: string): CupStats {
  const sorted = [...rows].sort(cupOrder);
  const editions: CupEdition[] = sorted.map((r, i) => {
    const previous = i > 0 ? sorted[i - 1].winner_id : null;
    return { ...r, edition: i + 1, previous, defended: previous === r.winner_id };
  });

  const players = new Map<string, PlayerCupStats>();
  let run = 0;
  editions.forEach((e, i) => {
    run = i > 0 && e.defended ? run + 1 : 1;
    const year = Number(e.held_on.slice(0, 4));
    const p = players.get(e.winner_id) ?? { user_id: e.winner_id, cups: 0, defenses: 0, streak: 0, lastYear: year, firstYear: year };
    p.cups++;
    if (e.defended) p.defenses++;
    p.streak = Math.max(p.streak, run);
    p.lastYear = year;
    players.set(e.winner_id, p);
  });

  // Regeerperiodes: aaneengesloten reeksen van dezelfde winnaar
  const reigns: { user_id: string; from: string; to: string | null }[] = [];
  for (const e of editions) {
    const last = reigns[reigns.length - 1];
    if (last && last.user_id === e.winner_id && last.to === null) continue;
    if (last && last.to === null) last.to = e.held_on;
    reigns.push({ user_id: e.winner_id, from: e.held_on, to: null });
  }
  const length = (r: { from: string; to: string | null }) => Math.max(0, dayNum(r.to ?? today) - dayNum(r.from));
  const maxReign = Math.max(0, ...reigns.map(length));

  const top = (key: "cups" | "streak" | "defenses") => {
    const list = [...players.values()];
    const best = Math.max(0, ...list.map((p) => p[key]));
    return best > 0 ? list.filter((p) => p[key] === best) : [];
  };

  const champion = editions.length ? editions[editions.length - 1].winner_id : null;
  const current = reigns.length ? reigns[reigns.length - 1] : null;
  return {
    editions,
    champion,
    championSince: current?.from ?? null,
    players,
    mostCups: top("cups"),
    longestStreak: top("streak"),
    mostDefenses: top("defenses"),
    longestReign: reigns.length ? reigns.filter((r) => length(r) === maxReign).map((r) => ({ ...r, days: maxReign })) : [],
  };
}

/** "1 jaar en 3 maanden", "45 dagen" */
export function reignLabel(days: number) {
  if (days < 60) return `${days} ${days === 1 ? "dag" : "dagen"}`;
  const months = Math.floor(days / 30.4375);
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (!y) return `${m} maanden`;
  return `${y} jaar${m ? ` en ${m} ${m === 1 ? "maand" : "maanden"}` : ""}`;
}

/** Datum van vandaag in Nederland (YYYY-MM-DD) */
export function todayNl(now: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(new Date(now));
}
