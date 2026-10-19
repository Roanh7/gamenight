"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLORS } from "@/lib/types";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const color = String(formData.get("color") ?? "red");
  if (!/^[A-Za-z0-9_]{2,20}$/.test(username)) {
    redirect(`/account?fout=${encodeURIComponent("Naam: 2–20 tekens, alleen letters, cijfers en _.")}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      bio: bio || null,
      avatar_color: (COLORS as string[]).includes(color) ? color : "red",
    })
    .eq("id", user.id);

  if (error) {
    const taken = error.code === "23505";
    redirect(`/account?fout=${encodeURIComponent(taken ? "Die naam is al bezet." : "Opslaan lukte niet.")}`);
  }
  revalidatePath("/", "layout");
  redirect(`/account?ok=${encodeURIComponent("Profiel opgeslagen")}`);
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    redirect(`/account?fout=${encodeURIComponent("Wachtwoord moet minimaal 6 tekens zijn.")}`);
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/account?fout=${encodeURIComponent("Wachtwoord wijzigen lukte niet.")}`);
  redirect(`/account?ok=${encodeURIComponent("Wachtwoord gewijzigd")}`);
}

/** Testmelding naar je eigen toestellen; geeft terug wat er gebeurde. */
export async function sendTestPush() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { sent: 0, devices: 0, problems: ["niet ingelogd"] };
  const { sendPushReport } = await import("@/lib/push");
  return sendPushReport([user.id], {
    title: "🎮 Game Night",
    body: "Het werkt! Zo krijg je straks meldingen over gamenights.",
    url: "/account",
    tag: "test",
  });
}

/** Een vrijgespeelde banner kiezen. De database controleert zelf of je hem echt hebt. */
export async function equipBanner(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const banner = String(formData.get("banner") ?? "");
  const { BANNER_BY_ID } = await import("@/lib/banners");
  const def = BANNER_BY_ID.get(banner);
  if (!def) redirect(`/account/banners?fout=${encodeURIComponent("Die banner bestaat niet.")}`);
  const { error } = await supabase.from("profiles").update({ banner }).eq("id", user.id);
  if (error) redirect(`/account/banners?fout=${encodeURIComponent("Die banner heb je nog niet vrijgespeeld.")}`);
  revalidatePath("/", "layout");
  redirect(`/account/banners?ok=${encodeURIComponent(`${def.emoji} ${def.name} staat nu op je profiel`)}`);
}

/**
 * Avatar opslaan (alleen je eigen profiel: de database staat niets anders toe).
 *  - emoji:  een emoji kiezen → je pixel-avatar gaat uit, de emoji wordt getoond
 *  - back:   terug naar je bewaarde emoji (of letter), zonder iets kwijt te raken
 *  - letter: geen emoji en geen pixel-avatar
 *  - pixel / preset: een pixel-personage. Je emoji blijft bewaard voor later.
 * Alles wordt eerst gecontroleerd; onbekende onderdelen vallen terug op een veilige standaard.
 */
export async function saveAvatar(input: { mode: "emoji" | "back" | "letter" | "pixel" | "preset"; emoji?: string | null; style?: unknown }): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };
  const { normalizeStyle } = await import("@/lib/pixelAvatar");
  const { EMOJI_GROUPS } = await import("@/lib/emojis");

  let update: Record<string, unknown>;
  if (input.mode === "emoji") {
    const e = typeof input.emoji === "string" ? input.emoji : "";
    if (!EMOJI_GROUPS.some((g) => g.emojis.includes(e))) return { error: "Die emoji kan niet." };
    update = { avatar_emoji: e, avatar_url: null, avatar_pixel: null };
  } else if (input.mode === "back") {
    update = { avatar_pixel: null };
  } else if (input.mode === "letter") {
    update = { avatar_emoji: null, avatar_url: null, avatar_pixel: null };
  } else {
    const style = normalizeStyle(input.style);
    if (!style || style.k !== input.mode) return { error: "Dit personage klopt niet." };
    update = { avatar_pixel: style, avatar_url: null };
  }
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "Opslaan lukte niet. Probeer het nog eens." };
  revalidatePath("/", "layout");
  return {};
}

/** Een frame dragen. Alleen gratis of vrijgespeelde frames: de database controleert dat zelf ook. */
export async function equipFrame(frame: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Je bent niet ingelogd." };
  const { FRAME_BY_ID } = await import("@/lib/frames");
  if (typeof frame !== "string" || !FRAME_BY_ID.has(frame)) return { error: "Dat frame bestaat niet." };
  const { error } = await supabase.from("profiles").update({ avatar_frame: frame }).eq("id", user.id);
  if (error) return { error: "Dit frame heb je nog niet vrijgespeeld." };
  revalidatePath("/", "layout");
  return {};
}
