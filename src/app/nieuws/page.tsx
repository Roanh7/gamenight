import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getActivity, getGames, getProfiles, getReactions } from "@/lib/data";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nieuws" };

export default async function NieuwsPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [profiles, games, activity] = await Promise.all([
    getProfiles(supabase),
    getGames(supabase),
    getActivity(supabase, 100),
  ]);

  const nightIds = [...new Set(activity.map((a) => a.night_id).filter(Boolean))] as string[];
  const { data: nights } = nightIds.length
    ? await supabase.from("game_nights").select("id, title").in("id", nightIds)
    : { data: [] };
  const nightsById = new Map((nights ?? []).map((n) => [n.id, n]));
  const reactions = me ? await getReactions(supabase, activity.map((a) => a.id), me.user.id, profiles.byId) : undefined;

  return (
    <div>
      <PageHeader back="/" kicker="LATEST NEWS" title="Al het nieuws" />
      {activity.length ? (
        <>
          <ActivityFeed
            items={activity}
            profiles={profiles.byId}
            games={games.byId}
            nights={nightsById}
            me={me ? { id: me.user.id, name: me.profile.username } : undefined}
            reactions={reactions}
          />
          {activity.length === 100 && (
            <p className="mt-3 text-center text-xs text-muted">Je ziet de laatste 100 berichten.</p>
          )}
        </>
      ) : (
        <EmptyState icon={<Newspaper size={32} />} title="Nog geen nieuws" />
      )}
    </div>
  );
}
