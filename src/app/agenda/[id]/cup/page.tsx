import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getNight, getProfiles } from "@/lib/data";
import { cupStats, todayNl } from "@/lib/smashCup";
import { getSmashCups } from "@/lib/smashCupData";
import { cupDate } from "@/components/SmashCup";
import { SmashCupCeremony } from "@/components/SmashCupCeremony";
import type { CeremonyPlayer } from "@/components/PodiumCeremony";
import { nowMs } from "@/lib/format";

export const metadata: Metadata = { title: "Smash Cup" };

/** 🏆 De bekeruitreiking van een bevestigde Smash Bros Championship Cup. Alleen lezen. */
export default async function CupCeremonyPage(props: PageProps<"/agenda/[id]/cup">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [data, profiles, rows] = await Promise.all([getNight(supabase, id), getProfiles(supabase), getSmashCups(supabase)]);
  if (!data || !me) notFound();

  const stats = cupStats(rows, todayNl(nowMs()));
  const ed = stats.editions.find((e) => e.night_id === id);
  if (!ed) redirect(`/agenda/${id}?fout=${encodeURIComponent("De winnaar van deze Smash Cup is nog niet bevestigd.")}`);

  // Begin van de regeerperiode waar deze editie bij hoort (bij een titelverdediging: de eerste zege van de reeks)
  let start = ed.edition - 1;
  while (start > 0 && stats.editions[start].defended) start--;
  const upTo = stats.editions.filter((e) => e.edition <= ed.edition && e.winner_id === ed.winner_id);
  const player = (uid: string): CeremonyPlayer => {
    const p = profiles.byId.get(uid);
    return { id: uid, name: p?.username ?? "Speler", color: p?.avatar_color ?? null, url: p?.avatar_url ?? null, emoji: p?.avatar_emoji ?? null, pixel: p?.avatar_pixel ?? null, frame: p?.avatar_frame ?? null };
  };

  return (
    <SmashCupCeremony
      auto={sp.auto === "1"}
      data={{
        nightId: id,
        title: data.night.title,
        winner: player(ed.winner_id),
        defended: ed.defended,
        previous: ed.previous ? player(ed.previous) : null,
        edition: ed.edition,
        cups: upTo.length,
        defenses: upTo.filter((e) => e.defended).length,
        heldOn: cupDate(stats.editions[start].held_on),
      }}
    />
  );
}
