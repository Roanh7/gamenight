import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getGames, getProfiles, getResults } from "@/lib/data";
import { computeXp, getAttendance } from "@/lib/xp";
import { computeRecords, gameRecords } from "@/lib/records";
import { Avatar } from "@/components/Avatar";
import { GameIcon } from "@/components/GameIcon";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Recordboek" };

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default async function RecordsPage() {
  const supabase = await createClient();
  const [profiles, games, results, attendance] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getResults(supabase),
    getAttendance(supabase),
  ]);
  const xpOf = computeXp(results, attendance);
  const records = computeRecords(results, attendance, xpOf);
  const perGame = gameRecords(results, games.list);
  const date = (iso: string) =>
    new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" }).format(
      new Date(iso),
    );

  const Holders = ({ ids }: { ids: string[] }) => (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex shrink-0 -space-x-1.5">
        {ids.slice(0, 3).map((id) => {
          const p = profiles.byId.get(id);
          return p ? <Avatar key={id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" /> : null;
        })}
      </div>
      <span className="truncate text-sm font-black">
        {ids.map((id) => profiles.byId.get(id)?.username ?? "?").join(" & ")}
      </span>
    </div>
  );

  return (
    <div>
      <PageHeader back="/ranking" kicker="RECORDBOEK" title="Records aller tijden" />
      <p className="-mt-3 mb-4 text-sm font-bold text-muted">
        Wie heeft het hoogst gescoord, de langste reeks, de meeste avonden? Alle seizoenen bij elkaar.
      </p>

      {results.length === 0 && (
        <p className="card mb-3 bg-yellow-soft px-4 py-3 text-sm font-bold">
          📜 Nog geen potjes gespeeld. Na de eerste gamenight vult het recordboek zich vanzelf. Wie pakt het eerste
          record?
        </p>
      )}
      {(
        <>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 [&>li]:min-w-0">
            {records.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 p-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-yellow-soft text-2xl">
                  {r.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="pixel text-[9px] uppercase text-muted">{r.title}</p>
                  {r.holders.length ? (
                    <Holders ids={r.holders} />
                  ) : (
                    <p className="text-sm font-black text-muted">Nog niemand</p>
                  )}
                  <p className="truncate text-[11px] text-muted">{r.hint}</p>
                </div>
                {r.holders.length > 0 && (
                  <span className="shrink-0 text-right">
                    <span className="pixel block text-sm">{fmt(r.value)}</span>
                    <span className="text-[10px] font-black uppercase text-muted">{r.unit}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>

          {perGame.length > 0 && (
            <>
              <SectionTitle>Hoogste score per game</SectionTitle>
              <ul className="card divide-y-2 divide-soft overflow-hidden">
                {perGame.map((g) => (
                  <li key={g.game.id}>
                    <Link href={`/games/${g.game.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                      <GameIcon icon={g.game.icon} color={g.game.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{g.game.name}</p>
                        <p className="truncate text-xs text-muted">
                          {g.holders.map((id) => profiles.byId.get(id)?.username ?? "?").join(" & ")} · {date(g.at)}
                          {g.game.scoring_mode === "lowest_wins" ? " · laagste wint" : ""}
                        </p>
                      </div>
                      <span className="pixel shrink-0 text-xs">{fmt(g.value)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
