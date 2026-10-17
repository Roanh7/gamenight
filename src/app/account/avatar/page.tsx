import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getMe } from "@/lib/supabase/server";
import { parseAvatar } from "@/lib/avatar";
import { PageHeader } from "@/components/ui";
import { AvatarMaker } from "@/components/AvatarMaker";

export const metadata: Metadata = { title: "Avatar maken" };

export default async function AvatarPage() {
  const me = await getMe();
  if (!me) redirect("/login");
  return (
    <div>
      <PageHeader back="/account" kicker="CHARACTER CREATOR" title="Maak je avatar" />
      <AvatarMaker name={me.profile.username} initial={parseAvatar(me.profile.avatar_config)} />
    </div>
  );
}
