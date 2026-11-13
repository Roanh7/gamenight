"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const back = (key: "fout" | "ok", msg: string) => redirect(`/smash-cup?${key}=${encodeURIComponent(msg)}#beheer`);

/** 🏆 Beheerder: een bekerwinnaar van vóór de app toevoegen (alleen echte, bekende uitslagen). */
export async function addHistoricCup(formData: FormData) {
  const supabase = await createClient();
  const date = String(formData.get("held_on") ?? "");
  const winner = String(formData.get("winner_id") ?? "");
  const note = String(formData.get("note") ?? "").slice(0, 200);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) back("fout", "Kies de datum van de Cup.");
  if (!UUID.test(winner)) back("fout", "Kies de winnaar.");
  const { error } = await supabase.rpc("add_historic_smash_cup", { p_held_on: date, p_winner: winner, p_note: note });
  if (error) back("fout", error.message?.replace(/^.*?: /, "") || "Toevoegen lukte niet.");
  revalidatePath("/", "layout");
  back("ok", "Historische Cup toegevoegd.");
}

/** Beheerder: een historische invoer weghalen (bijv. een tikfout). Uitslagen van echte Cup-avonden blijven staan. */
export async function removeHistoricCup(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) back("fout", "Niet gevonden.");
  const { error } = await supabase.rpc("remove_historic_smash_cup", { p_id: id });
  if (error) back("fout", error.message?.replace(/^.*?: /, "") || "Weghalen lukte niet.");
  revalidatePath("/", "layout");
  back("ok", "Historische Cup weggehaald.");
}
