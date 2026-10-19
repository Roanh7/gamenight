import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles, getResults } from "@/lib/data";
import { computeXp, getAttendance } from "@/lib/xp";
import { syncBanners, unseenBanners } from "@/lib/bannerSync";
import { FRAMES, lockLine, ownedFrames, safeFrame, unseenFrames } from "@/lib/frames";
import { PageHeader } from "@/components/ui";
import { FrameUnlock } from "@/components/FrameUnlock";
import { AvatarStudio } from "./AvatarStudio";

export const metadata: Metadata = { title: "Avatar" };

export default async function AvatarPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const [profiles, results, attendance] = await Promise.all([getProfiles(supabase), getResults(supabase), getAttendance(supabase)]);
  const xpOf = computeXp(results, attendance);
  const { rows, statsOf } = await syncBanners(supabase, { userIds: profiles.list.map((p) => p.id), results, attendance, xpOf });
  const owned = ownedFrames(rows, me.user.id);
  const stats = statsOf(me.user.id);
  const p = me.profile;
  // Een frame dat (na een correctie) niet meer van jou is, tonen we niet als gedragen
  const frame = owned.has(safeFrame(p.avatar_frame)) ? safeFrame(p.avatar_frame) : "none";

  return (
    <div>
      {unseenBanners(rows, me.user.id).length === 0 && (
        <FrameUnlock ids={unseenFrames(rows, me.user.id)} userId={me.user.id} name={p.username} color={p.avatar_color} emoji={p.avatar_emoji} pixel={p.avatar_pixel} />
      )}
      <PageHeader back="/account" kicker="CUSTOMIZE AVATAR" title="Jouw avatar" />
      <AvatarStudio
        name={p.username}
        color={p.avatar_color}
        emoji={p.avatar_emoji}
        pixel={p.avatar_pixel}
        frame={frame}
        frames={FRAMES.map((f) => ({
          id: f.id,
          name: f.name,
          emoji: f.emoji,
          description: f.description,
          owned: owned.has(f.id),
          lock: owned.has(f.id) ? null : lockLine(f, stats),
        }))}
      />
    </div>
  );
}
