const TZ = "Europe/Amsterdam";

export function formatDateLong(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function dayParts(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: TZ }).format(d);
  const month = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: TZ })
    .format(d)
    .replace(".", "");
  return { day, month };
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "gisteren";
  if (days < 7) return `${days} dagen geleden`;
  return formatDateShort(iso);
}

export function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "nu bezig";
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return `over ${Math.max(1, Math.floor(diff / 60000))} min`;
  if (hours < 24) return `over ${hours} uur`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "morgen" : `over ${days} dagen`;
}

export function formatScore(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "–";
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
}

export function ordinal(n: number) {
  return `${n}e`;
}

/** ISO-tijdstip van `hours` uur geleden (voor queries). */
export function hoursAgoIso(hours: number) {
  return new Date(Date.now() - hours * 3600_000).toISOString();
}
