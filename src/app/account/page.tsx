import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { getMe } from "@/lib/supabase/server";
import type { Color, Profile } from "@/lib/types";
import { logout } from "../(auth)/actions";
import { changePassword, updateProfile } from "./actions";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ColorPicker } from "@/components/ColorPicker";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SoundToggle } from "@/components/Celebrate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage(props: PageProps<"/account">) {
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  const profile = me.profile as Profile;

  return (
    <div>
      <Flash sp={sp} />
      <PlayerProfile profile={profile} isMe />

      <SectionTitle>Gegevens</SectionTitle>
      <section className="card mb-3 p-4">
        <AvatarPicker
          userId={me.user.id}
          name={profile.username}
          color={profile.avatar_color}
          emoji={profile.avatar_emoji}
        />
      </section>
      <details className="card overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-black">✏️ Profiel bewerken</summary>
        <form action={updateProfile} className="space-y-4 border-t-2 border-line p-4">
          <div>
            <label className="label" htmlFor="username">
              Spelersnaam
            </label>
            <input
              id="username"
              name="username"
              className="input"
              defaultValue={profile.username}
              required
              minLength={2}
              maxLength={20}
              pattern="[A-Za-z0-9_]+"
            />
          </div>
          <div>
            <span className="label">Kleur</span>
            <ColorPicker name="color" defaultValue={profile.avatar_color as Color} />
          </div>
          <div>
            <label className="label" htmlFor="bio">
              Bio <span className="font-bold text-muted">(max 140 tekens)</span>
            </label>
            <input id="bio" name="bio" className="input" defaultValue={profile.bio ?? ""} maxLength={140} placeholder="bijv. Blue shell sniper" />
          </div>
          <SubmitButton pendingText="Opslaan…">Opslaan</SubmitButton>
        </form>
      </details>

      <details className="card mt-3 overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-black">🔑 Wachtwoord wijzigen</summary>
        <form action={changePassword} className="space-y-4 border-t-2 border-line p-4">
          <p className="text-sm text-muted">Ingelogd als {me.user.email}</p>
          <div>
            <label className="label" htmlFor="password">
              Nieuw wachtwoord
            </label>
            <input id="password" name="password" type="password" minLength={6} autoComplete="new-password" className="input" required />
          </div>
          <SubmitButton pendingText="Wijzigen…">Wijzig wachtwoord</SubmitButton>
        </form>
      </details>

      <div className="card mt-3 px-4 py-3">
        <p className="mb-2 font-black">🌙 Weergave</p>
        <ThemeToggle />
        <p className="mt-2 text-xs text-muted">Auto volgt je iPhone: is die donker, dan krijg je de nachtmodus.</p>
      </div>

      <div className="card mt-3 flex items-center justify-between gap-3 px-4 py-3">
        <span className="font-black">🔊 Geluidjes bij winst</span>
        <SoundToggle />
      </div>

      <form action={logout} className="mt-6">
        <SubmitButton className="btn btn-secondary w-full" pendingText="Uitloggen…">
          <LogOut size={18} strokeWidth={2.5} /> Uitloggen
        </SubmitButton>
      </form>
    </div>
  );
}
