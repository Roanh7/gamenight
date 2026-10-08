import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { PlayerProfile } from "@/components/PlayerProfile";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Speler" };

export default async function PlayerPage(props: PageProps<"/spelers/[username]">) {
  const { username } = await props.params;
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", decodeURIComponent(username).replace(/[\\%_]/g, (c) => `\\${c}`))
    .maybeSingle();
  if (!data) notFound();
  if (data.id === me?.user.id) redirect("/account");
  return (
    <div>
      <PageHeader back="/ranking" kicker="SPELERSPROFIEL" title="" />
      <PlayerProfile profile={data as Profile} isMe={false} viewerId={me?.user.id} />
    </div>
  );
}
