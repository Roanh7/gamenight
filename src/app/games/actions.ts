"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLORS } from "@/lib/types";
import { GAME_ICON_KEYS } from "@/lib/icons";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function parseTeams(raw: string) {
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .map((t) => ({
        name: String(t?.name ?? "").trim().slice(0, 30),
        points: Math.max(0, Math.min(999, Math.round(Number(t?.points) || 0))),
      }))
      .filter((t) => t.name)
      .filter((t, i, all) => all.findIndex((x) => x.name.toLowerCase() === t.name.toLowerCase()) === i)
      .slice(0, 6);
  } catch {
    return [];
  }
}

function parseGame(fd: FormData) {
  const placement = [1, 2, 3, 4, 5, 6]
    .map((i) => str(fd, `p${i}`))
    .map((v) => (v === "" ? null : Math.max(0, Math.round(Number(v)) || 0)));
  // Lege plekken aan het eind weglaten
  while (placement.length && placement[placement.length - 1] === null) placement.pop();
  const color = str(fd, "color");
  const icon = str(fd, "icon");
  const max = str(fd, "max_players");
  const min = Math.max(1, Number(str(fd, "min_players")) || 2);
  return {
    name: str(fd, "name"),
    icon: GAME_ICON_KEYS.includes(icon) ? icon : "gamepad",
    color: (COLORS as string[]).includes(color) ? color : "red",
    description: str(fd, "description") || null,
    rules: str(fd, "rules") || null,
    min_players: min,
    max_players: max ? Math.max(min, Number(max) || min) : null,
    scoring_mode: str(fd, "scoring_mode") === "lowest_wins" ? "lowest_wins" : "highest_wins",
    placement_points: placement.map((v) => v ?? 0),
    participation_points: Math.max(0, Math.round(Number(str(fd, "participation_points")) || 0)),
    is_team: fd.get("is_team") === "on",
    teams: fd.get("is_team") === "on" ? parseTeams(str(fd, "teams")) : [],
  };
}

export async function createGame(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const game = parseGame(formData);
  if (!game.name) redirect(`/games/nieuw?fout=${encodeURIComponent("Geef de game een naam.")}`);
  const { data, error } = await supabase
    .from("games")
    .insert({ ...game, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) redirect(`/games/nieuw?fout=${encodeURIComponent("Opslaan lukte niet.")}`);
  revalidatePath("/", "layout");
  redirect(`/games/${data.id}?ok=${encodeURIComponent("Game toegevoegd!")}`);
}

export async function updateGame(formData: FormData) {
  const supabase = await createClient();
  const id = str(formData, "game_id");
  const game = parseGame(formData);
  if (!game.name) redirect(`/games/${id}/bewerken?fout=${encodeURIComponent("Geef de game een naam.")}`);
  const { error } = await supabase.from("games").update(game).eq("id", id);
  if (error) redirect(`/games/${id}/bewerken?fout=${encodeURIComponent("Opslaan lukte niet.")}`);
  revalidatePath("/", "layout");
  redirect(`/games/${id}?ok=${encodeURIComponent("Opgeslagen")}`);
}

export async function deleteGame(formData: FormData) {
  const supabase = await createClient();
  const id = str(formData, "game_id");
  const { data } = await supabase.from("games").delete().eq("id", id).select("id");
  if (!data?.length)
    redirect(
      `/games/${id}/bewerken?fout=${encodeURIComponent("Alleen wie de game toevoegde kan hem verwijderen, en alleen als er nog niet mee gespeeld is.")}`,
    );
  revalidatePath("/", "layout");
  redirect("/ranking");
}
