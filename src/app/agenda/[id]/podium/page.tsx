import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getNight, getProfiles } from "@/lib/data";
import { computeRecap } from "@/lib/recap";
import { podiumStandings, podiumSteps } from "@/lib/podium";
import { PodiumCeremony, type CeremonyData, type CeremonyPlayer } from "@/components/PodiumCeremony";

export const metadata: Metadata = { title: "Podium Ceremony" };

/** De prijsuitreiking van een afgesloten avond. Alleen lezen: er verandert niets aan punten of XP. */
export default async function PodiumPage(props: PageProps<"/agenda/[id]/podium">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [data, profiles, { data: ceremony }] = await Promise.all([
    getNight(supabase, id),
    getProfiles(supabase),
    supabase.from("night_ceremonies").select("closed_at").eq("night_id", id).maybeSingle(),
  ]);
  if (!data || !me) notFound();
  const { night, matches, results } = data;
  if (night.status !== "finished") {
    redirect(`/agenda/${id}?fout=${encodeURIComponent("De Podium Ceremony begint pas als de avond is afgesloten.")}`);
  }

  const recap = computeRecap(matches, results);
  const player = (uid: string): CeremonyPlayer => {
    const p = profiles.byId.get(uid);
    return { id: uid, name: p?.username ?? "Speler", color: p?.avatar_color ?? null, url: p?.avatar_url ?? null, emoji: p?.avatar_emoji ?? null };
  };

  let ceremonyData: CeremonyData = { nightId: id, title: night.title, closedAt: ceremony?.closed_at ?? null, steps: [], standings: [], stats: [] };
  if (recap && recap.rows.length) {
    const rows = podiumStandings(recap);
    const steps = podiumSteps(rows);
    const doneIds = new Set(matches.filter((m) => m.status === "finished").map((m) => m.id));
    const udWins = results.filter((r) => doneIds.has(r.match_id) && (r.underdog_bonus ?? 0) > 0).length;
    const stats: CeremonyData["stats"] = [
      { icon: "🎮", label: recap.matches === 1 ? "potje gespeeld" : "potjes gespeeld", value: String(recap.matches) },
      { icon: "👥", label: rows.length === 1 ? "deelnemer" : "deelnemers", value: String(rows.length) },
      { icon: "🕹️", label: recap.games.length === 1 ? "game" : "verschillende games", value: String(recap.games.length) },
    ];
    if (recap.mvp) stats.push({ icon: "⭐", label: "MVP", value: player(recap.mvp).name });
    if (recap.mostWins) stats.push({ icon: "🏆", label: "meeste zeges", value: `${player(recap.mostWins.user_id).name} (${recap.mostWins.wins})` });
    if (udWins > 0) stats.push({ icon: "🐺", label: udWins === 1 ? "underdog-zege" : "underdog-zeges", value: String(udWins) });
    if (recap.unlucky) stats.push({ icon: "🧂", label: "pechvogel", value: `${player(recap.unlucky.user_id).name} (${recap.unlucky.last}x laatst)` });
    ceremonyData = {
      ...ceremonyData,
      steps: steps.map((s) => ({ place: s.place, players: s.rows.map((r) => ({ player: player(r.user_id), points: r.points })) })),
      standings: rows.map((r) => ({ player: player(r.user_id), points: r.points, wins: r.wins, played: r.played, place: r.place })),
      stats,
    };
  }

  return <PodiumCeremony data={ceremonyData} auto={sp.auto === "1"} />;
}
