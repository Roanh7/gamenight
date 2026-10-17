import type { Profile } from "@/lib/types";
import type { Recap } from "@/lib/recap";
import { Avatar } from "./Avatar";
import { RecapShare } from "./RecapShare";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Samenvatting van een afgelopen avond: MVP, stand en prijsjes. */
export function NightRecap({
  recap,
  profiles,
  nightId,
  title,
}: {
  recap: Recap;
  profiles: Map<string, Profile>;
  nightId: string;
  title: string;
}) {
  const p = (uid: string | null | undefined) => (uid ? profiles.get(uid) : undefined);
  const mvp = p(recap.mvp);
  const mvpRow = recap.rows.find((r) => r.user_id === recap.mvp);
  const wins = p(recap.mostWins?.user_id);
  const unlucky = p(recap.unlucky?.user_id);

  return (
    <section id="recap" className="card mt-4 scroll-mt-20 overflow-hidden">
      <div className="flex items-center justify-between border-b-2 border-line bg-yellow px-4 py-2">
        <span className="pixel text-[11px]">🏁 RECAP</span>
        <span className="text-xs font-black">
          {recap.matches} {recap.matches === 1 ? "potje" : "potjes"}
        </span>
      </div>

      <div className="flex items-center gap-3 bg-yellow-soft px-4 py-4">
        {mvp ? (
          <>
            <Avatar name={mvp.username} color={mvp.avatar_color} url={mvp.avatar_url} emoji={mvp.avatar_emoji} size="lg" crown />
            <div className="min-w-0">
              <p className="pixel text-[10px] text-muted">MVP VAN DE AVOND</p>
              <p className="truncate text-xl font-black">{mvp.username}</p>
              <p className="text-xs font-bold text-muted">
                {mvpRow?.points} punten · {mvpRow?.wins}x gewonnen
              </p>
            </div>
          </>
        ) : (
          <p className="font-black">🤝 Gedeelde eerste plek, geen MVP vanavond!</p>
        )}
      </div>

      <ol className="divide-y-2 divide-soft border-y-2 border-line">
        {recap.rows.map((r, i) => {
          const pr = p(r.user_id);
          if (!pr) return null;
          return (
            <li key={r.user_id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-6 text-center text-sm font-black">{MEDALS[i] ?? i + 1}</span>
              <Avatar name={pr.username} color={pr.avatar_color} url={pr.avatar_url} emoji={pr.avatar_emoji} size="sm" />
              <span className="min-w-0 flex-1 truncate font-black">{pr.username}</span>
              <span className="text-xs font-bold text-muted">{r.wins}🏆</span>
              <span className="pixel w-10 text-right text-xs">{r.points}</span>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="rounded-xl border-2 border-line bg-green-soft px-3 py-2">
          <p className="text-xs font-bold">🏆 Meeste zeges</p>
          <p className="truncate font-black">{wins ? `${wins.username} (${recap.mostWins?.wins})` : "Gedeeld"}</p>
        </div>
        <div className="rounded-xl border-2 border-line bg-red-soft px-3 py-2">
          <p className="text-xs font-bold">🧂 Pechvogel</p>
          <p className="truncate font-black">
            {unlucky ? `${unlucky.username} (${recap.unlucky?.last}x laatst)` : "Niemand!"}
          </p>
        </div>
      </div>
      <div className="px-3 pb-3">
        <RecapShare nightId={nightId} title={title} />
      </div>
    </section>
  );
}
