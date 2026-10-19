import type { Metadata } from "next";
import Link from "next/link";
import { Newspaper } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getActivity, getComments, getGames, getProfiles, getReactions } from "@/lib/data";
import { NEWS_FILTERS, newsFilter } from "@/lib/news";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EmptyState, PageHeader } from "@/components/ui";
import { PixelIcon } from "@/components/PixelIcon";

export const metadata: Metadata = { title: "Game Night News" };

/**
 * 📰 GAME NIGHT NEWS — de volledige nieuwsfeed (dezelfde activity-tabel als altijd),
 * met reacties en comments. Filters gebruiken alleen de bestaande berichttypes (src/lib/news.ts).
 * Later kan hier een tabblad "Sportkrant" bij, naast deze feed.
 */
export default async function NieuwsPage(props: PageProps<"/nieuws">) {
  const sp = await props.searchParams;
  const filter = newsFilter(typeof sp.filter === "string" ? sp.filter : null);
  const me = await getMe();
  const supabase = await createClient();
  const [profiles, games, activity] = await Promise.all([getProfiles(supabase), getGames(supabase), getActivity(supabase, 100, filter.types)]);

  const nightIds = [...new Set(activity.map((a) => a.night_id).filter(Boolean))] as string[];
  const { data: nights } = nightIds.length ? await supabase.from("game_nights").select("id, title").in("id", nightIds) : { data: [] };
  const nightsById = new Map((nights ?? []).map((n) => [n.id, n]));
  const [reactions, comments] = me
    ? await Promise.all([getReactions(supabase, activity.map((a) => a.id), me.user.id, profiles.byId), getComments(supabase, activity.map((a) => a.id))])
    : [undefined, undefined];

  return (
    <div>
      <PageHeader back="/" kicker="📰 GAME NIGHT NEWS" title="Nieuws" />

      <nav className="news-filters -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter het nieuws">
        {NEWS_FILTERS.map((f) => {
          const on = f.id === filter.id;
          return (
            <Link
              key={f.id}
              href={f.id === "all" ? "/nieuws" : `/nieuws?filter=${f.id}`}
              aria-current={on ? "page" : undefined}
              className={`news-filter ${on ? "is-on" : ""}`}
              scroll={false}
            >
              <span aria-hidden>{f.emoji}</span> {f.label}
            </Link>
          );
        })}
      </nav>

      {activity.length ? (
        <>
          <ActivityFeed
            items={activity}
            profiles={profiles.byId}
            games={games.byId}
            nights={nightsById}
            me={me ? { id: me.user.id, name: me.profile.username } : undefined}
            reactions={reactions}
            comments={comments}
          />
          {activity.length === 100 && <p className="mt-3 text-center text-xs text-muted">Je ziet de laatste 100 berichten.</p>}
        </>
      ) : (
        <EmptyState
          icon={filter.id === "all" ? <Newspaper size={32} /> : <PixelIcon name="news" size={32} />}
          title={filter.id === "all" ? "Nog geen nieuws" : `Nog geen ${filter.label.toLowerCase()}-nieuws`}
          text={filter.id === "all" ? undefined : "Kies een ander filter of kijk later nog eens."}
        />
      )}
    </div>
  );
}
