/**
 * Nieuwscategorieën voor de News Hub. Alleen gebaseerd op de bestaande berichttypes (activity.type),
 * dus geen gokwerk: elk type hoort bij precies één categorie.
 * Bewust GEEN "Records" of "Rivalries": daar bestaan (nog) geen eigen berichttypes voor.
 */
export const NEWS_FILTERS = [
  { id: "all", label: "All", emoji: "📰", types: null },
  { id: "results", label: "Results", emoji: "🏁", types: ["match_finished", "night_recap", "underdog_win", "history_correction"] },
  { id: "rankings", label: "Rankings", emoji: "📈", types: ["rank_up"] },
  { id: "unlocks", label: "Unlocks", emoji: "✨", types: ["banner_unlocked"] },
  { id: "group", label: "Groep", emoji: "📅", types: ["night_planned", "host_changed", "member_joined", "game_added"] },
] as const;

export type NewsFilter = (typeof NEWS_FILTERS)[number]["id"];

export function newsFilter(id: string | undefined | null) {
  return NEWS_FILTERS.find((f) => f.id === id) ?? NEWS_FILTERS[0];
}

/** Kort label voor het soort bericht (in de compacte kaartjes op Home). */
export function newsKind(type: string) {
  const f = NEWS_FILTERS.find((x) => x.types?.some((t) => t === type));
  return f ? { label: f.label.toUpperCase(), emoji: f.emoji } : { label: "NEWS", emoji: "📰" };
}
