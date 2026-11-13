"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COLORS } from "@/lib/types";
import { pushLater } from "@/lib/push";

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

  if (!error && data.user) {
    // Iedereen (behalve de nieuwe speler zelf) hoort dat er iemand bij is gekomen
    pushLater(
      null,
      {
        title: `👋 ${username} doet nu mee!`,
        body: "Er is een nieuwe speler bij Game Night. Tijd voor een potje?",
        url: `/spelers/${username}`,
        tag: `nieuw-${data.user.id}`,
      },
      data.user.id,
    );
  }

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

/**
 * 🔑 Wachtwoord vergeten: nieuw wachtwoord instellen met de herstelcode van de beheerder.
 * De database controleert de code (24 uur geldig, max. 5 pogingen, één keer bruikbaar).
 * Lukt het, dan log je meteen in met je nieuwe wachtwoord.
 */
export async function resetWithCode(_: AuthState, formData: FormData): Promise<AuthState> {
  const login = String(formData.get("login") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("password2") ?? "");
  if (!login || !code || !password) return { error: "Vul alle velden in." };
  if (password.length < 6) return { error: "Je nieuwe wachtwoord moet minimaal 6 tekens zijn." };
  if (password !== again) return { error: "De twee wachtwoorden zijn niet hetzelfde." };

  const supabase = await createClient();
  const { data: email, error } = await supabase.rpc("reset_password_with_code", { p_login: login, p_code: code, p_password: password });
  if (error) {
    const msg = error.message ?? "";
    return { error: msg.includes("minimaal") ? "Je nieuwe wachtwoord moet minimaal 6 tekens zijn." : "Code ongeldig of verlopen. Vraag de beheerder om een nieuwe code." };
  }
  if (!email) return { error: "Die code klopt niet. Let op: na 5 foute pogingen vervalt de code." };

  const { error: loginError } = await supabase.auth.signInWithPassword({ email: String(email), password });
  if (loginError) return { info: "Je wachtwoord is gewijzigd. Log nu in met je e-mail en je nieuwe wachtwoord." };
  revalidatePath("/", "layout");
  redirect("/");
}
