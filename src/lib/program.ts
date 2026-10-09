import type { createClient } from "./supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * Zet een game erbij bij de games van een avond (ook halverwege de avond).
 * Bij een stem-avond komt hij naast de games met stemmen te staan.
 */
export async function appendToProgram(supabase: DB, nightId: string, gameId: string) {
  const { data: night } = await supabase.from("game_nights").select("game_ids").eq("id", nightId).maybeSingle();
  if (!night) return false;
  const ids: string[] = night.game_ids ?? [];
  if (ids.includes(gameId)) return true;
  const { data, error } = await supabase
    .from("game_nights")
    .update({ game_ids: [...ids, gameId] })
    .eq("id", nightId)
    .select("id");
  return !error && !!data?.length;
}
