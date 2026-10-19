import type { Profile } from "@/lib/types";
import { Avatar } from "./Avatar";

/** Klein 🐺-labeltje naast een naam. */
export function UnderdogChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`pixel inline-flex shrink-0 items-center gap-0.5 rounded-md border-2 border-line bg-night px-1 py-0.5 text-[7px] leading-none text-yellow ${className}`}
      title="Underdog: +2 competitiepunten bij winst"
    >
      🐺 UNDERDOG
    </span>
  );
}

/** "🐺 UNDERDOG BONUS ACTIVE" — wie kan er in dit potje extra punten pakken. Alleen voor host/co-host. */
export function UnderdogActive({
  players,
  note,
}: {
  players: { profile: Profile; bonus: number }[];
  note?: string;
}) {
  if (!players.length) return null;
  return (
    <section className="card mb-4 overflow-hidden bg-night text-white shadow-[0_4px_0_var(--color-line),inset_0_0_0_2px_#ffc52766]">
      <p className="pixel border-b-2 border-line bg-[#2b2640] px-3 py-2 text-[9px] text-yellow">🐺 UNDERDOG BONUS ACTIVE</p>
      <ul className="divide-y-2 divide-[#2b2640]">
        {players.map(({ profile: p, bonus }) => (
          <li key={p.id} className="flex items-center gap-2.5 px-3 py-2">
            <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size="xs" />
            <span className="min-w-0 flex-1 truncate text-sm font-black">{p.username}</span>
            <span className="shrink-0 text-xs font-bold text-yellow">+{bonus} competitiepunten bij winst</span>
          </li>
        ))}
      </ul>
      {note && <p className="px-3 pb-2.5 pt-1 text-[11px] font-bold opacity-75">{note}</p>}
    </section>
  );
}

/** Uitsplitsing: normale punten + underdog-bonus = totaal. */
export function UnderdogBreakdown({ rows }: { rows: { name: string; base: number; bonus: number }[] }) {
  if (!rows.length) return null;
  return (
    <div className="border-t-2 border-line bg-night px-3 py-2.5 text-white">
      {rows.map((r) => (
        <div key={r.name} className="py-1">
          <p className="pixel text-[8px] text-yellow">🐺 UNDERDOG VICTORY · {r.name.toUpperCase()}</p>
          <dl className="mt-1 grid grid-cols-3 gap-1 text-center">
            <div className="rounded-lg bg-[#2b2640] px-1 py-1">
              <dt className="text-[10px] font-bold opacity-75">Normale punten</dt>
              <dd className="pixel text-[11px]">+{r.base}</dd>
            </div>
            <div className="rounded-lg bg-[#2b2640] px-1 py-1">
              <dt className="text-[10px] font-bold opacity-75">Underdog Bonus</dt>
              <dd className="pixel text-[11px] text-yellow">+{r.bonus}</dd>
            </div>
            <div className="rounded-lg bg-yellow px-1 py-1 text-night">
              <dt className="text-[10px] font-bold">Totaal</dt>
              <dd className="pixel text-[11px]">+{r.base + r.bonus}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}
