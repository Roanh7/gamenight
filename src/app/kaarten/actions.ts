"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Kies welke kaart je laat zien (op Home, je profiel en in het album). */
export async function setFavoriteCard(formData: FormData) {
  const value = String(formData.get("card") ?? "").trim();
  if (!/^(standard|gold|rivalry|legend|underdog|undefeated|season:\d{4}-Q[1-4])$/.test(value)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ favorite_card: value }).eq("id", user.id);
  revalidatePath("/", "layout");
}

/** Kies de stijl van je kaart (Verzamelkaart, Game Boy, RPG-menu of Arcadekast). */
export async function setCardStyle(formData: FormData) {
  const value = String(formData.get("style") ?? "");
  if (!["gameboy", "rpg", "arcade", "trading"].includes(value)) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ card_style: value }).eq("id", user.id);
  revalidatePath("/", "layout");
}
