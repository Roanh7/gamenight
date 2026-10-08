"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLORS } from "@/lib/types";

export type AuthState = { error?: string; info?: string } | undefined;

function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vul je e-mail en wachtwoord in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("not confirmed"))
      return { error: "Je e-mailadres is nog niet bevestigd. Check je inbox (en spam)." };
    return { error: "E-mail of wachtwoord klopt niet." };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const invite = String(formData.get("invite") ?? "").trim();
  const colorRaw = String(formData.get("color") ?? "red");
  const color = (COLORS as string[]).includes(colorRaw) ? colorRaw : "red";

  if (!/^[A-Za-z0-9_]{2,20}$/.test(username))
    return { error: "Gebruikersnaam: 2–20 tekens, alleen letters, cijfers en _." };
  if (!email.includes("@")) return { error: "Vul een geldig e-mailadres in." };
  if (password.length < 6) return { error: "Wachtwoord moet minimaal 6 tekens zijn." };

  const supabase = await createClient();

  const { data: inviteOk } = await supabase.rpc("check_invite_code", { p_code: invite });
  if (!inviteOk) return { error: "Die uitnodigingscode klopt niet. Vraag hem even in de groepsapp." };

  const { data: free } = await supabase.rpc("username_available", { p_username: username });
  if (free === false) return { error: `De naam "${username}" is al bezet. Kies een andere.` };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, invite_code: invite, avatar_color: color },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists"))
      return { error: "Er bestaat al een account met dit e-mailadres. Log in." };
    if (msg.includes("rate limit"))
      return { error: "Even te veel aanmeldingen tegelijk. Probeer het over een paar minuten opnieuw." };
    if (msg.includes("database error")) return { error: "Uitnodigingscode of naam klopt niet." };
    return { error: "Account aanmaken lukte niet: " + error.message };
  }

  if (!data.session) {
    return { info: "Bijna klaar! Check je mail en klik op de bevestigingslink. Daarna kun je inloggen." };
  }

  revalidatePath("/", "layout");
  redirect("/?welkom=1");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
