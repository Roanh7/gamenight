import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import { cupStats, todayNl } from "@/lib/smashCup";
import { getSmashCups } from "@/lib/smashCupData";
import { nowMs } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SmashCupCard, cupDate } from "@/components/SmashCup";
import { SmashCupHall } from "@/components/SmashCupHall";
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

  return (
    <div>
      <PageHeader back="/ranking?tab=cup" kicker="🏆 HALL OF CHAMPIONS" title="Smash Cup History" />
      <Flash sp={sp} />
      <SmashCupCard stats={stats} profiles={profiles.byId} today={today} href={null} />

      <SmashCupHall stats={stats} profiles={profiles.byId} />

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
      <p className="pixel text-[10px] text-red">🔑 BEHEER · HISTORISCHE WINNAARS</p>
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
