import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getGames, getProfiles } from "@/lib/data";
import { ProgramPicker } from "@/components/ProgramPicker";
import { createNight } from "../actions";
import { DateTimeField } from "@/components/DateTimeField";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Gamenight plannen" };

export default async function NewNightPage(props: PageProps<"/agenda/nieuw">) {
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [profiles, games] = await Promise.all([getProfiles(supabase), getGames(supabase)]);

  return (
    <div>
      <PageHeader back="/agenda" kicker="NIEUW" title="Plan een gamenight" />
      <Flash sp={sp} />
      <form action={createNight} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="title">
            Naam van de avond
          </label>
          <input id="title" name="title" className="input" placeholder="bijv. Mario Kart Madness" maxLength={80} required />
        </div>
        <div>
          <label className="label" htmlFor="starts_at">
            Datum & tijd
          </label>
          <DateTimeField name="starts_at" />
        </div>
        <div>
          <label className="label" htmlFor="location">
            Locatie <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <input id="location" name="location" className="input" placeholder="bijv. bij Chip thuis" maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="host_id">
            Host van de avond
          </label>
          <select id="host_id" name="host_id" className="input" defaultValue={me?.user.id}>
            {profiles.list.map((p) => (
              <option key={p.id} value={p.id}>
                {p.username}
                {p.id === me?.user.id ? " (ik)" : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">De host bevestigt deelnemers en houdt de scores bij.</p>
        </div>
        <ProgramPicker games={games.list} />
        <div>
          <label className="label" htmlFor="notes">
            Notities <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <textarea id="notes" name="notes" className="input" placeholder="Snacks meenemen? Controllers?" maxLength={1000} />
        </div>
        <SubmitButton pendingText="Plannen…">▶ Plan avond</SubmitButton>
      </form>
    </div>
  );
}
