"use client";

import type { ScoreSync } from "@/lib/scoreSync";

/** Klein lampje onderaan: is alles echt op de server opgeslagen? */
export function SyncStatus({ engine }: { engine: ScoreSync }) {
  const n = engine.count();
  const s = engine.status;
  const [cls, text] =
    s === "offline"
      ? ["bg-orange text-white", `📴 Offline — ${n} ${n === 1 ? "wijziging staat" : "wijzigingen staan"} alleen op dit apparaat`]
      : s === "error"
        ? ["bg-red text-white", "⚠ Niet opgeslagen"]
        : n > 0 || s === "saving"
          ? ["bg-yellow text-night", "⏳ Bezig met opslaan…"]
          : ["bg-green text-white", "✓ Alles opgeslagen"];
  return (
    <span role="status" aria-live="polite" className={`chip max-w-full truncate border-2 border-line px-3 py-1 text-xs shadow-[0_2px_0_var(--color-line)] ${cls}`}>
      {text}
    </span>
  );
}

/** Melding als host en co-host tegelijk dezelfde score aanpasten, of als opslaan geweigerd werd. */
export function ConflictNotice({
  engine,
  label,
  who,
}: {
  engine: ScoreSync;
  /** Leesbare naam van een scorecel, bijv. "Sem in ronde 2" */
  label: (key: string) => string;
  /** Naam van degene die het laatst wijzigde */
  who: (id: string | null) => string;
}) {
  if (!engine.conflicts.length && !engine.lastError) return null;
  return (
    <div role="alert" className="mt-4 space-y-2 rounded-2xl border-2 border-line bg-yellow-soft p-3 text-sm">
      {engine.conflicts.map((c, i) => (
        <p key={i}>
          ⚠️ <b>{who(c.by)}</b> heeft de score van <b>{label(c.key)}</b> net aangepast naar <b>{c.theirs ?? "leeg"}</b>. Jouw
          invoer ({c.mine ?? "leeg"}) is daarom niet opgeslagen. Check even welke klopt.
        </p>
      ))}
      {engine.lastError && <p>⚠️ Opslaan geweigerd: {engine.lastError}</p>}
      <button
        type="button"
        onClick={() => {
          engine.dismissConflicts();
          engine.clearError();
        }}
        className="btn btn-secondary btn-sm"
      >
        Oké, gezien
      </button>
    </div>
  );
}
