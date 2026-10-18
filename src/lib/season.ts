/** Seizoensthema van de achtergrond, op basis van de datum in Nederland. */
export type SeasonTheme = "halloween" | "christmas" | null;

export function seasonTheme(d: Date = new Date()): SeasonTheme {
  const month = Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Amsterdam", month: "numeric" }).format(d));
  if (month === 10) return "halloween";
  if (month === 12) return "christmas";
  return null;
}
