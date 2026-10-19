import type { Profile } from "@/lib/types";
import type { SeasonImpact } from "@/lib/history";
import { seasonLabel } from "@/lib/stats";

/**
 * 📜 Waarschuwing voor een wijziging in een afgesloten seizoen.
 * Laat zien wat er verandert (kampioen, plekken) en vraagt om een getypte bevestiging.
 * Zet dit binnen een <form>; de knop komt als children.
 */
export function HistoryWarning({
  seasons,
  impacts,
  profiles,
  word,
  intro,
  temporary,
  children,
}: {
  seasons: string[];
  impacts: SeasonImpact[];
  profiles: Map<string, Profile>;
  word: string;
  intro: string;
  temporary?: boolean;
  children: React.ReactNode;
}) {
  const name = (id: string | null) => (id ? (profiles.get(id)?.username ?? "?") : null);
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-line bg-paper shadow-[0_4px_0_var(--color-line)]">
      <p className="pixel border-b-2 border-line bg-yellow px-3 py-2 text-[9px] text-night">📜 HISTORISCH SEIZOEN</p>
      <div className="space-y-3 p-3 text-sm">
        <p className="font-bold">
          {intro} Dit hoort bij {seasons.length === 1 ? "seizoen" : "seizoenen"}{" "}
          <b>{seasons.map(seasonLabel).join(", ")}</b>, dat al is afgesloten.
        </p>
        {impacts.length > 0 && (
          <ul className="space-y-2">
            {impacts.map((im) => {
              const before = name(im.championBefore);
              const after = name(im.championAfter);
              return (
                <li key={im.season} className="rounded-xl border-2 border-line bg-cream px-3 py-2">
                  <p className="pixel text-[8px] text-muted">
                    {seasonLabel(im.season).toUpperCase()}
                    {temporary ? " · ZOLANG HET POTJE OPEN STAAT" : ""}
                  </p>
                  <p className="mt-1 text-xs font-bold">
                    {im.championBefore === im.championAfter
                      ? before
                        ? `👑 ${before} blijft kampioen.`
                        : "👑 Nog steeds geen (unieke) kampioen."
                      : `👑 Kampioen verandert: ${before ?? "geen"} → ${after ?? "geen (gedeelde 1e plek)"}`}
                  </p>
                  {im.movers.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted">
                      {im.movers
                        .slice(0, 5)
                        .map((m) => `${name(m.user_id)} ${m.before ? `#${m.before}` : "–"} → ${m.after ? `#${m.after}` : "weg"}`)
                        .join(" · ")}
                      {im.movers.length > 5 ? ` · +${im.movers.length - 5}` : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-muted">De volgorde van de eindstand blijft gelijk.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs font-bold text-muted">
          Iedereen ziet in het nieuws dat er een historische correctie is gedaan. Doe dit alleen bij een echte fout.
        </p>
        <label className="block">
          <span className="label">
            Typ <b className="pixel text-[10px]">{word}</b> om te bevestigen
          </span>
          <input
            name="bevestiging"
            className="input uppercase"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Typ hier…"
          />
        </label>
        {children}
      </div>
    </div>
  );
}
