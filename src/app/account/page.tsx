import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { ownedBanners, shownBanner, type UnlockRow } from "@/lib/bannerSync";
import { BANNERS, bannerDef } from "@/lib/banners";
import { Banner } from "@/components/Banner";
import type { Color, Profile } from "@/lib/types";
import { logout } from "../(auth)/actions";
import { changePassword, updateProfile } from "./actions";
import { PlayerProfile } from "@/components/PlayerProfile";
import { ColorPicker } from "@/components/ColorPicker";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FRAME_BY_ID, FRAMES, ownedFrames, safeFrame } from "@/lib/frames";
import { normalizeStyle, PRESET_BY_ID } from "@/lib/pixelAvatar";
import { SoundToggle } from "@/components/Celebrate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PushToggle } from "@/components/PushToggle";
import { SubmitButton } from "@/components/SubmitButton";
import { Flash } from "@/components/Flash";
import { SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage(props: PageProps<"/account">) {
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  const profile = me.profile as Profile;
  // Wat je hebt vrijgespeeld (alleen lezen; vrijspelen zelf gebeurt zoals altijd door de server)
  const supabase = await createClient();
  const [{ data: unlockData }, { data: bannerRow }] = await Promise.all([
    supabase.from("banner_unlocks").select("user_id, banner_id, revoked_at, seen, unlocked_at").eq("user_id", me.user.id),
    supabase.from("profiles").select("banner").eq("id", me.user.id).maybeSingle(),
  ]);
  const unlocks = (unlockData ?? []) as UnlockRow[];
  const frames = ownedFrames(unlocks, me.user.id);
  const frame = frames.has(safeFrame(profile.avatar_frame)) ? safeFrame(profile.avatar_frame) : "none";
  const banners = ownedBanners(unlocks, me.user.id);
  const banner = shownBanner(bannerRow?.banner, banners);

  return (
    <div>
      <Flash sp={sp} />
      <PlayerProfile profile={profile} isMe />

      {/* ---------- 🎨 Customize Player: avatar, frames en banners op één plek ---------- */}
      <div id="customize" className="scroll-mt-20">
        <SectionTitle>🎨 Customize Player</SectionTitle>
      </div>
      <section className="hub-panel" aria-label="Customize Player">
        <Link href="/account/avatar" className="customize-row">
          <Avatar name={profile.username} color={profile.avatar_color} url={profile.avatar_url} emoji={profile.avatar_emoji} pixel={profile.avatar_pixel} size="md" />
          <span className="min-w-0 flex-1">
            <span className="pixel block text-[8px] text-muted">AVATAR</span>
            <span className="block truncate font-black">{avatarLabel(profile)}</span>
            <span className="block truncate text-xs font-bold text-muted">Emoji, Pixel Avatar Creator of een personage</span>
          </span>
          <span className="customize-go" aria-hidden>
            ▶
          </span>
        </Link>
        <Link href="/account/avatar#frames" className="customize-row">
          <Avatar name={profile.username} color={profile.avatar_color} url={profile.avatar_url} emoji={profile.avatar_emoji} pixel={profile.avatar_pixel} frame={frame} size="md" />
          <span className="min-w-0 flex-1">
            <span className="pixel block text-[8px] text-muted">AVATAR FRAMES · {frames.size}/{FRAMES.length}</span>
            <span className="block truncate font-black">{FRAME_BY_ID.get(frame)!.name}</span>
            <span className="block truncate text-xs font-bold text-muted">Vrijgespeeld kiezen, vergrendeld met voorwaarden</span>
          </span>
          <span className="customize-go" aria-hidden>
            ▶
          </span>
        </Link>
        <Link href="/account/banners" className="customize-row">
          <span className="relative block h-10 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-line">
            <Banner id={banner} still />
          </span>
          <span className="min-w-0 flex-1">
            <span className="pixel block text-[8px] text-muted">PROFILE BANNERS · {banners.size}/{BANNERS.length}</span>
            <span className="block truncate font-black">{bannerDef(banner).name}</span>
            <span className="block truncate text-xs font-bold text-muted">Vrijgespeeld kiezen, vergrendeld met voorwaarden</span>
          </span>
          <span className="customize-go" aria-hidden>
            ▶
          </span>
        </Link>
      </section>

      <SectionTitle>👤 Account</SectionTitle>
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

      <div id="instellingen" className="scroll-mt-20">
        <SectionTitle>⚙️ Settings</SectionTitle>
      </div>
      <div className="card px-4 py-3">
        <p className="mb-2 font-black">🔔 Meldingen op dit toestel</p>
        <PushToggle />
        <p className="mt-2 text-xs text-muted">
          Bij een nieuwe gamenight, een nieuwe speler, reacties en comments op jouw nieuws, als je bevestigd bent, als de datum vaststaat, als de avond begint, de recap, en
          een uur van tevoren.
        </p>
      </div>

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

function avatarLabel(p: Profile) {
  const st = normalizeStyle(p.avatar_pixel);
  if (st?.k === "preset") return `Personage: ${PRESET_BY_ID.get(st.id)?.name}`;
  if (st) return "Eigen pixel-personage";
  if (p.avatar_emoji) return `Emoji: ${p.avatar_emoji}`;
  return "Je letter";
}
