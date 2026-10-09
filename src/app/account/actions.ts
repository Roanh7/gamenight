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

/** Testmelding naar je eigen toestellen. */
export async function sendTestPush() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { sendPush } = await import("@/lib/push");
  return sendPush([user.id], {
    title: "🎮 Game Night",
    body: "Het werkt! Zo krijg je straks meldingen over gamenights.",
    url: "/account",
    tag: "test",
  });
}
