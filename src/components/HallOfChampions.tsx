import type { Profile } from "@/lib/types";
import type { HallEntry, HallSeason } from "@/lib/history";
import { seasonLabel, seasonMonths } from "@/lib/stats";
import { Avatar } from "./Avatar";
import { TrophySprite } from "./TrophyCabinet";

const MEDAL = ["🥇", "🥈", "🥉"];

/** 👑 HALL OF CHAMPIONS — alle seizoenskampioenen, hun titels en de seizoenen. */
export function HallOfChampions({
  entries,
  timeline,
  profiles,
  currentSeason,
}: {
  entries: HallEntry[];
  timeline: HallSeason[];
  profiles: Map<string, Profile>;
  currentSeason: string;
}) {
  const totalTitles = entries.reduce((n, e) => n + e.titles, 0);
  return (
    <section id="hall-of-champions" className="hall mt-8 scroll-mt-20" aria-label="Hall of Champions">
      <p className="hall-sign pixel">👑 HALL OF CHAMPIONS</p>
      <div className="hall-inside">
        <div className="hall-stars" aria-hidden />
        {entries.length ? (
          <>
            <p className="relative mb-3 text-center text-[11px] font-bold text-[#e9dcff]/80">
              {totalTitles} {totalTitles === 1 ? "seizoenstitel" : "seizoenstitels"} uitgereikt · {entries.length}{" "}
              {entries.length === 1 ? "kampioen" : "kampioenen"}
            </p>
            <ol className="relative space-y-2.5">
              {entries.map((e) => {
                const p = profiles.get(e.user_id);
                const top = e.rank === 1;
                return (
                  <li key={e.user_id} className={`hall-row ${top ? "is-top" : ""}`}>
                    <span className="w-7 shrink-0 text-center text-lg leading-none">
                      {MEDAL[e.rank - 1] ?? <span className="pixel text-[10px] text-[#e9dcff]/70">{e.rank}</span>}
                    </span>
                    {p && <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size={top ? "lg" : "md"} crown />}
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-black ${top ? "text-lg" : ""}`}>{p?.username ?? "Oud-speler"}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.seasons.map((s) => (
                          <span key={s} className="hall-plaque">
                            {seasonLabel(s)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="flex items-end -space-x-2" aria-hidden>
                        {Array.from({ length: Math.min(e.titles, 3) }, (_, i) => (
                          <TrophySprite key={i} name="cup" size={top ? 30 : 24} />
                        ))}
                      </span>
                      <span className="pixel mt-1 text-[10px] text-[#ffd23f]">
                        {e.titles}× {e.titles === 1 ? "TITEL" : "TITELS"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <div className="relative py-4 text-center">
            <div className="flex justify-center opacity-70">
              <TrophySprite name="cup" size={56} locked />
            </div>
            <p className="pixel mt-3 text-[10px] text-[#ffd23f]">NOG GEEN KAMPIOENEN</p>
            <p className="mx-auto mt-2 max-w-xs text-xs font-bold text-[#e9dcff]/80">
              De eerste titel wordt uitgereikt na seizoen {seasonLabel(currentSeason)} ({seasonMonths(currentSeason)}). Wie
              dan alleen bovenaan staat, komt hier voor altijd te staan.
            </p>
          </div>
        )}

        {timeline.length > 0 && (
          <div className="relative mt-4 border-t-2 border-dashed border-[#5b4a8a] pt-3">
            <p className="pixel mb-2 text-[8px] text-[#e9dcff]/70">SEIZOEN PER SEIZOEN</p>
            <ul className="space-y-1.5">
              {timeline.map((t) => {
                const p = t.champion ? profiles.get(t.champion) : undefined;
                return (
                  <li key={t.season} className="flex items-center gap-2 text-sm">
                    <span className="hall-plaque shrink-0">{seasonLabel(t.season)}</span>
                    {t.champion ? (
                      <>
                        {p && <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size="xs" />}
                        <span className="min-w-0 flex-1 truncate font-black">{p?.username ?? "Oud-speler"}</span>
                        <span aria-hidden>🏆</span>
                      </>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#e9dcff]/70">🤝 Gedeelde eerste plek, geen kampioen</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
