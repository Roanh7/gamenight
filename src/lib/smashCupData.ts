import { cache } from "react";
import type { createClient } from "./supabase/server";
import { cupOrder, type CupRow } from "./smashCup";

type DB = Awaited<ReturnType<typeof createClient>>;

/** Alle bekeruitslagen (één keer per verzoek opgehaald) */
export const getSmashCups = cache(async (supabase: DB): Promise<CupRow[]> => {
  const { data } = await supabase
    .from("smash_cups")
    .select("id, night_id, held_on, winner_id, is_historic, note, confirmed_at")
    .order("held_on", { ascending: true })
    .order("confirmed_at", { ascending: true });
  return (data ?? []) as CupRow[];
});

/** Wie heeft nu de beker? (null = nog niemand) */
export async function getSmashChampion(supabase: DB) {
  const rows = await getSmashCups(supabase);
  return rows.length ? [...rows].sort(cupOrder)[rows.length - 1].winner_id : null;
}
