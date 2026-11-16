import Link from "next/link";
import type { Profile } from "@/lib/types";
import { reignLabel, type CupStats, type PlayerCupStats } from "@/lib/smashCup";
import { Panel } from "./ui";
import { Avatar } from "./Avatar";
import { CupIcon } from "./CupIcon";
import { cupDate } from "./SmashCup";

/** 🏆 Smash Cup History: alle edities, records en uitleg. Gebruikt op Ranking → Smash Cup en op /smash-cup. */
export function SmashCupHall({ stats, profiles }: { stats: CupStats; profiles: Map<string, Profile> }) {
  const editions = [...stats.editions].reverse();
  const name = (id: string) => profiles.get(id)?.username ?? "Oud-speler";
  const names = (list: PlayerCupStats[]) => list.map((p) => name(p.user_id)).join(" & ");
  const records: { icon: string; label: string; value: string; who: string }[] = [
    { icon: "🏆", label: "MEESTE BEKERS", value: stats.mostCups.length ? `${stats.mostCups[0].cups}×` : "–", who: names(stats.mostCups) || "Nog niemand" },
    {
      icon: "🔗",
      label: "TITELS OP RIJ",
      value: stats.longestStreak.length ? `${stats.longestStreak[0].streak}×` : "–",
      who: names(stats.longestStreak) || "Nog niemand",
    },
    {
      icon: "🛡️",
      label: "TITELVERDEDIGINGEN",
      value: stats.mostDefenses.length ? `${stats.mostDefenses[0].defenses}×` : "0",
      who: names(stats.mostDefenses) || "Nog geen verdediging",
    },
    {
      icon: "⏳",
      label: "LANGST REGEREND",
      value: stats.longestReign.length ? reignLabel(stats.longestReign[0].days) : "–",
      who: stats.longestReign.length ? stats.longestReign.map((r) => `${name(r.user_id)}${r.to ? "" : " (nog bezig)"}`).join(" & ") : "Nog niemand",
    },
  ];

  return (
    <>
      <Panel title="SMASH CUP HISTORY" icon={<CupIcon size={12} title={null} />} tone="var(--cup-soft)" className="mt-4">
        {editions.length ? (
          <ol className="divide-y-2 divide-soft">
            {editions.map((e) => {
              const p = profiles.get(e.winner_id);
              const current = e.edition === stats.editions.length;
              return (
                <li key={e.id} className={`flex items-center gap-3 px-3 py-3 ${current ? "bg-[color:var(--cup-soft)]" : ""}`}>
                  <span className="pixel w-12 shrink-0 text-center text-[13px]">{e.held_on.slice(0, 4)}</span>
                  {p && <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-black">
                      <span className="truncate">{name(e.winner_id)}</span>
                      {current && (
                        <span className="inline-flex shrink-0 items-center rounded-full border-2 border-line bg-[color:var(--cup-1)] px-2 text-[11px] font-black text-[#1b1424]">
                          👑 Current Champion
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-bold text-muted">
                      Editie #{e.edition} · {cupDate(e.held_on)}
                      {e.defended ? " · 🛡️ titel verdedigd" : e.previous ? ` · nam de beker over van ${name(e.previous)}` : ""}
                    </p>
                    {e.is_historic && (
                      <p className="text-[11px] font-bold text-muted">📜 Van vóór de app{e.note ? ` · ${e.note}` : ""}</p>
                    )}
                  </div>
                  {e.night_id && (
                    <Link href={`/agenda/${e.night_id}/cup`} className="shrink-0 text-[11px] font-black hover:underline" aria-label={`Bekeruitreiking ${e.held_on.slice(0, 4)}`}>
                      🎬 ▶
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-3 py-4 text-center text-sm font-bold text-muted">Nog geen bekeruitslagen. De eerste Championship Cup schrijft geschiedenis!</p>
        )}
      </Panel>

      <Panel title="RECORDS" icon={<span aria-hidden>📊</span>} className="mt-4">
        <dl className="grid grid-cols-2">
          {records.map((r, i) => (
            <div key={r.label} className={`px-3 py-3 ${i % 2 ? "border-l-2 border-line" : ""} ${i > 1 ? "border-t-2 border-line" : ""}`}>
              <dt className="text-[11px] font-black uppercase leading-snug text-muted">
                {r.icon} {r.label}
              </dt>
              <dd className="pixel mt-1.5 text-[13px]">{r.value}</dd>
              <dd className="mt-0.5 truncate text-xs font-bold">{r.who}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="card mt-4 p-4 text-sm font-bold">
        <p className="font-black">Hoe werkt de wisselbeker?</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-5">
          <li>Plan een avond met Smash Bros en kies <b>🏆 Smash Bros Championship Cup</b>.</li>
          <li>Na afloop bevestigt de host of co-host op de avondpagina wie heeft gewonnen.</li>
          <li>De winnaar wordt <b>REIGNING SMASH CHAMPION</b> en draagt de gouden beker tot de volgende Cup.</li>
          <li>Punten, XP en ranking veranderen er niet door.</li>
        </ul>
      </div>

    </>
  );
}
