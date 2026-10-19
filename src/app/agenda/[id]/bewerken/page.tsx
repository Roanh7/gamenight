import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getProfiles, getResults } from "@/lib/data";
import { historicSeasons, seasonImpact } from "@/lib/history";
import { HistoryWarning } from "@/components/HistoryWarning";
import type { GameNight } from "@/lib/types";
import { deleteNight, updateNight } from "../../actions";
import { DateTimeField } from "@/components/DateTimeField";
import { ProgramPicker } from "@/components/ProgramPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Avond bewerken" };

export default async function EditNightPage(props: PageProps<"/agenda/[id]/bewerken">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [{ data }, profiles, games, { data: matchRows }] = await Promise.all([
    supabase.from("game_nights").select("*").eq("id", id).maybeSingle(),
    getProfiles(supabase),
    getGames(supabase),
    supabase.from("matches").select("id, finished_at, original_finished_at").eq("night_id", id),
  ]);
  if (!data || !me) notFound();
  const night = data as GameNight;
  const uid = me.user.id;
  const canEdit = night.host_id === uid || night.cohost_id === uid || night.created_by === uid;
  if (!canEdit) {
    redirect(`/agenda/${id}?fout=${encodeURIComponent("Alleen de host, co-host of planner kan deze avond aanpassen.")}`);
  }
  const canDelete = night.host_id === uid || night.created_by === uid;
  // 📜 Hoort deze avond (deels) bij een afgesloten seizoen? Dan eerst laten zien wat er verandert.
  const nightMatches = (matchRows ?? []) as { id: string; finished_at: string | null; original_finished_at: string | null }[];
  const pastSeasons = night.is_practice ? [] : historicSeasons(nightMatches);
  const impacts = pastSeasons.length && canDelete ? seasonImpact(await getResults(supabase), new Set(nightMatches.map((m) => m.id))) : [];

  return (
    <div>
      <PageHeader back={`/agenda/${id}`} kicker="AVOND BEWERKEN" title={night.title} />
      <Flash sp={sp} />

      <form action={updateNight} className="card space-y-4 p-5">
        <input type="hidden" name="night_id" value={id} />
        <div>
          <label className="label" htmlFor="title">
            Naam van de avond
          </label>
          <input id="title" name="title" className="input" defaultValue={night.title} maxLength={80} required />
        </div>
        <div>
          <label className="label" htmlFor="starts_at">
            Datum & tijd
          </label>
          {night.date_poll && night.status === "planned" ? (
            <>
              <input type="hidden" name="starts_at" value={night.starts_at} />
              <p className="rounded-xl bg-cream px-3 py-2 text-sm font-bold">
                📅 De datumprikker loopt nog. Kies de datum op de{" "}
                <a href={`/agenda/${id}`} className="underline">
                  pagina van de avond
                </a>
                .
              </p>
            </>
          ) : (
            <DateTimeField name="starts_at" defaultValue={night.starts_at} />
          )}
        </div>
        <div>
          <label className="label" htmlFor="location">
            Locatie <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <input id="location" name="location" className="input" defaultValue={night.location ?? ""} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="host_id">
            Host
          </label>
          <select id="host_id" name="host_id" className="input" defaultValue={night.host_id}>
            {profiles.list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
                {p.id === uid ? " (ik)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">De host bevestigt deelnemers en houdt de scores bij.</p>
        </div>
        <div>
          <label className="label" htmlFor="cohost_id">
            Co-host <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <select id="cohost_id" name="cohost_id" className="input" defaultValue={night.cohost_id ?? ""}>
            <option value="">Geen co-host</option>
            {profiles.list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">De co-host kan alles wat de host kan.</p>
        </div>
        <ProgramPicker games={games.list} defaultMode={night.vote_mode} defaultGames={night.game_ids ?? []} />
        <div>
          <label className="label" htmlFor="notes">
            Notities <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <textarea id="notes" name="notes" className="input" defaultValue={night.notes ?? ""} maxLength={1000} />
        </div>
        <SubmitButton pendingText="Opslaan…">💾 Wijzigingen opslaan</SubmitButton>
      </form>

      {canDelete && pastSeasons.length > 0 && (
        <form action={deleteNight} className="mt-6">
          <input type="hidden" name="night_id" value={id} />
          <HistoryWarning
            seasons={pastSeasons}
            impacts={impacts}
            profiles={profiles.byId}
            word="VERWIJDER"
            intro="Als je deze avond verwijdert, verdwijnen alle potjes en punten ervan."
          >
            <SubmitButton
              className="btn btn-secondary w-full text-red"
              confirm="Weet je het zeker? Dit verandert de eindstand van een afgesloten seizoen."
              pendingText="Verwijderen…"
            >
              📜 Avond uit afgesloten seizoen verwijderen
            </SubmitButton>
          </HistoryWarning>
        </form>
      )}
      {canDelete && pastSeasons.length === 0 && (
        <form action={deleteNight} className="mt-6">
          <input type="hidden" name="night_id" value={id} />
          <SubmitButton
            className="btn btn-secondary btn-sm w-full text-red"
            confirm="Deze avond en alle potjes ervan definitief verwijderen? De punten verdwijnen ook van de ranglijst."
          >
            Avond verwijderen
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
