import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import { cupStats, reignLabel, todayNl, type PlayerCupStats } from "@/lib/smashCup";
import { getSmashCups } from "@/lib/smashCupData";
import { nowMs } from "@/lib/format";
import { PageHeader, Panel } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { Avatar } from "@/components/Avatar";
import { CupIcon } from "@/components/CupIcon";
import { SmashCupCard, cupDate } from "@/components/SmashCup";
import { SubmitButton } from "@/components/SubmitButton";
import { addHistoricCup, removeHistoricCup } from "./actions";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Smash Cup History" };

/** 🏆 Hall of Champions van de Smash Bros Championship Cup: elke editie, records en (voor de beheerder) historische invoer. */
export default async function SmashCupPage(props: PageProps<"/smash-cup">) {
  const sp = await props.searchParams;
  const supabase = await createClient();
  const [profiles, rows, { data: isAdmin }] = await Promise.all([getProfiles(supabase), getSmashCups(supabase), supabase.rpc("is_app_admin")]);
  const today = todayNl(nowMs());
  const stats = cupStats(rows, today);
  const editions = [...stats.editions].reverse();
  const name = (id: string) => profiles.byId.get(id)?.username ?? "Oud-speler";
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
    <div>
      <PageHeader back="/ranking#smash-cup" kicker="🏆 HALL OF CHAMPIONS" title="Smash Cup History" />
      <Flash sp={sp} />
      <SmashCupCard stats={stats} profiles={profiles.byId} today={today} href={null} />

      <Panel title="SMASH CUP HISTORY" icon={<CupIcon size={12} title={null} />} tone="var(--cup-soft)" className="mt-4">
        {editions.length ? (
          <ol className="divide-y-2 divide-soft">
            {editions.map((e) => {
              const p = profiles.byId.get(e.winner_id);
              const current = e.edition === stats.editions.length;
              return (
                <li key={e.id} className={`flex items-center gap-3 px-3 py-3 ${current ? "bg-[color:var(--cup-soft)]" : ""}`}>
                  <span className="pixel w-12 shrink-0 text-center text-[13px]">{e.held_on.slice(0, 4)}</span>
                  {p && <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} pixel={p.avatar_pixel} frame={p.avatar_frame} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-black">
                      <span className="truncate">{name(e.winner_id)}</span>
                      {current && (
                        <span className="cup-chip">
                          <CupIcon size={11} title={null} /> 👑 CURRENT CHAMPION
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
              <dt className="pixel text-[7px] leading-relaxed text-muted">
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

      {isAdmin && <AdminHistoric players={profiles.list} historic={stats.editions.filter((e) => e.is_historic)} today={today} />}
    </div>
  );
}

function AdminHistoric({
  players,
  historic,
  today,
}: {
  players: Profile[];
  historic: { id: string; held_on: string; winner_id: string; note: string | null }[];
  today: string;
}) {
  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <section id="beheer" className="card mt-4 scroll-mt-20 p-4">
      <p className="pixel text-[9px] text-red">🔑 BEHEER · HISTORISCHE WINNAARS</p>
      <p className="mt-1.5 text-xs font-bold text-muted">
        Voor Cups van vóór de app. Voeg alleen uitslagen toe die echt zo gebeurd zijn. De nieuwste uitslag (op datum) bepaalt wie de beker nu heeft.
      </p>
      <form action={addHistoricCup} className="mt-3 grid gap-2">
        <label className="text-xs font-black" htmlFor="held_on">
          Datum van de Cup
        </label>
        <input id="held_on" name="held_on" type="date" max={today} required className="input" />
        <label className="text-xs font-black" htmlFor="winner_id">
          Winnaar
        </label>
        <select id="winner_id" name="winner_id" required defaultValue="" className="input">
          <option value="" disabled>
            Kies de winnaar…
          </option>
          {[...players]
            .sort((a, b) => a.username.localeCompare(b.username))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
        </select>
        <label className="text-xs font-black" htmlFor="note">
          Notitie (optioneel)
        </label>
        <input id="note" name="note" maxLength={200} className="input" placeholder="bijv. Kerst-Cup bij Sinan thuis" />
        <SubmitButton className="btn btn-yellow w-full" pendingText="Toevoegen…">
          🏆 Historische Cup toevoegen
        </SubmitButton>
      </form>
      {historic.length > 0 && (
        <ul className="mt-4 divide-y-2 divide-soft rounded-xl border-2 border-line">
          {historic.map((h) => (
            <li key={h.id} className="flex items-center gap-2 px-3 py-2 text-sm font-bold">
              <span className="min-w-0 flex-1 truncate">
                {cupDate(h.held_on)} — {byId.get(h.winner_id)?.username ?? "?"}
              </span>
              <form action={removeHistoricCup}>
                <input type="hidden" name="id" value={h.id} />
                <SubmitButton className="btn btn-secondary btn-sm" pendingText="…" confirm={`De Cup van ${cupDate(h.held_on)} weghalen?`}>
                  Weghalen
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
