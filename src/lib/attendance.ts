/**
 * 📅 My Attendance — wie was er echt bij?
 *
 * Een avond telt mee als hij is afgesloten, geen oefenavond is en er minstens één potje is afgerond.
 * (Afgelaste avonden en avonden waarop niets is gespeeld tellen dus niet.)
 *
 * Per speler per avond:
 *  - AANWEZIG       minstens één afgerond potje gespeeld, of door de host/co-host op "aanwezig" gezet
 *  - NIET GEKOMEN   wel aangemeld of bevestigd, maar niet aanwezig
 *  - AFGEMELD       zelf afgemeld (pas sinds deze functie bewaard; oude avonden kennen dit niet)
 *  - NIET GEREAGEERD geen aanmelding en geen afmelding
 *
 * Percentages tellen pas vanaf het moment dat iemand lid werd. Avond-XP, de records "Meeste avonden" /
 * "Trouwste speler" en de banner Midnight Gamer gebruiken dezelfde aanwezigheidsregel (presentAttendance in xp.ts).
 */

/** Minimaal aantal relevante avonden (sinds je lid bent) voor de officiële aanwezigheidsranglijst. */
export const ATTENDANCE_MIN_NIGHTS = 3;

export type AttNight = { id: string; starts_at: string; status: string; is_practice?: boolean | null; title?: string };
export type AttStatus = "present" | "noshow" | "declined" | "noreply";
export type AttInput = {
  nights: AttNight[];
  results: { night_id?: string; user_id: string }[];
  participants: { night_id: string; user_id: string; status: string }[];
  declines: { night_id: string; user_id: string }[];
  marks: { night_id: string; user_id: string; present: boolean }[];
};

export type AttStats = {
  user_id: string;
  relevant: number;
  attended: number;
  missed: number;
  noshow: number;
  declined: number;
  noreply: number;
  pct: number | null; // 0–100, null als er nog geen relevante avonden zijn
  current: number;
  longest: number;
  activeMonths: string[]; // "2026-10" (bij gelijk aantal: allemaal)
  activeCount: number;
};

const TZ = "Europe/Amsterdam";
const monthKey = (iso: string) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(new Date(iso));
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}`;
};

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
/** "2026-10" → "oktober 2026" */
export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Bouwt de opzoektabellen één keer, zodat alles snel en consequent hetzelfde rekent. */
export function attendanceModel(input: AttInput) {
  const played = new Set(input.results.filter((r) => r.night_id).map((r) => `${r.night_id}|${r.user_id}`));
  const nightsWithResults = new Set(input.results.map((r) => r.night_id).filter(Boolean) as string[]);
  const signed = new Set(input.participants.map((p) => `${p.night_id}|${p.user_id}`));
  const declined = new Set(input.declines.map((d) => `${d.night_id}|${d.user_id}`));
  const marked = new Set(input.marks.filter((m) => m.present).map((m) => `${m.night_id}|${m.user_id}`));

  /** Avonden die meetellen, oudste eerst. */
  const relevant = input.nights
    .filter((n) => n.status === "finished" && !n.is_practice && nightsWithResults.has(n.id))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const status = (nightId: string, userId: string): AttStatus => {
    const k = `${nightId}|${userId}`;
    if (played.has(k) || marked.has(k)) return "present";
    if (signed.has(k)) return "noshow"; // aanmelding/bevestiging telt nooit vanzelf als aanwezig
    if (declined.has(k)) return "declined";
    return "noreply";
  };

  /** Statistieken van één speler; `joinedAt` = moment dat hij lid werd. */
  const stats = (userId: string, joinedAt: string): AttStats => {
    const joined = Date.parse(joinedAt);
    const mine = relevant.filter((n) => Date.parse(n.starts_at) >= joined || status(n.id, userId) === "present");
    const list = mine.map((n) => ({ n, s: status(n.id, userId) }));
    const attended = list.filter((x) => x.s === "present").length;
    let longest = 0;
    let run = 0;
    for (const x of list) {
      run = x.s === "present" ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    let current = 0;
    for (let i = list.length - 1; i >= 0 && list[i].s === "present"; i--) current++;
    const perMonth = new Map<string, number>();
    for (const x of list) if (x.s === "present") perMonth.set(monthKey(x.n.starts_at), (perMonth.get(monthKey(x.n.starts_at)) ?? 0) + 1);
    const activeCount = Math.max(0, ...perMonth.values());
    return {
      user_id: userId,
      relevant: list.length,
      attended,
      missed: list.length - attended,
      noshow: list.filter((x) => x.s === "noshow").length,
      declined: list.filter((x) => x.s === "declined").length,
      noreply: list.filter((x) => x.s === "noreply").length,
      pct: list.length ? (attended / list.length) * 100 : null,
      current,
      longest,
      activeMonths: activeCount ? [...perMonth.entries()].filter(([, c]) => c === activeCount).map(([m]) => m).sort() : [],
      activeCount,
    };
  };

  return { relevant, status, stats };
}

/** Ranglijst: hoogste percentage, dan meeste avonden; helemaal gelijk = gedeelde plek. */
export function attendanceBoard(all: AttStats[], min = ATTENDANCE_MIN_NIGHTS) {
  // exact vergelijken (zonder afrondfouten): a.attended / a.relevant vs b.attended / b.relevant
  const cmp = (a: AttStats, b: AttStats) => b.attended * a.relevant - a.attended * b.relevant || b.attended - a.attended;
  const ranked = all.filter((s) => s.relevant >= min).sort(cmp);
  const rows = ranked.map((s) => ({ ...s, rank: 1 + ranked.filter((o) => cmp(o, s) < 0).length }));
  const unranked = all.filter((s) => s.relevant < min && s.relevant > 0).sort((a, b) => b.relevant - a.relevant);
  return { ranked: rows, unranked };
}

/** 81,8 — maximaal één decimaal. */
export function formatPct(p: number | null) {
  if (p === null) return "–";
  const r = Math.round(p * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace(".", ",");
}
