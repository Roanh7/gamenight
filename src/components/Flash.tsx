import { ErrorNote } from "./ui";

/** Toont ?fout= of ?ok= meldingen uit de URL. */
export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const fout = typeof sp.fout === "string" ? sp.fout : null;
  const ok = typeof sp.ok === "string" ? sp.ok : null;
  if (fout)
    return (
      <div className="mb-4">
        <ErrorNote message={fout} />
      </div>
    );
  if (ok)
    return (
      <p className="animate-pop mb-4 rounded-xl border-2 border-line bg-green-soft px-3 py-2 text-sm font-bold">
        ✓ {ok}
      </p>
    );
  return null;
}
