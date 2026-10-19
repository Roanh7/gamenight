import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles, getResults } from "@/lib/data";
import { computeXp, getAttendance } from "@/lib/xp";
import { BANNERS } from "@/lib/banners";
import { ownedBanners, shownBanner, syncBanners, unseenBanners } from "@/lib/bannerSync";
import { BannerUnlock } from "@/components/BannerUnlock";
import { Flash } from "@/components/Flash";
import { PageHeader } from "@/components/ui";
import { BannerGrid } from "./BannerGrid";

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage(props: PageProps<"/account/banners">) {
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const [profiles, results, attendance] = await Promise.all([getProfiles(supabase), getResults(supabase), getAttendance(supabase)]);
  const xpOf = computeXp(results, attendance);
  const { rows, statsOf } = await syncBanners(supabase, { userIds: profiles.list.map((p) => p.id), results, attendance, xpOf });
  const owned = ownedBanners(rows, me.user.id);
  const chosen = profiles.byId.get(me.user.id)?.banner;
  const equipped = shownBanner(chosen, owned);
  const stats = statsOf(me.user.id);

  return (
    <div>
      <BannerUnlock ids={unseenBanners(rows, me.user.id)} userId={me.user.id} />
      <PageHeader back="/account#customize" kicker="CUSTOMIZE PLAYER" title="Banner collection" />
      <Flash sp={sp} />
      <p className="-mt-3 mb-4 text-sm font-bold text-muted">
        {owned.size} van {BANNERS.length} vrijgespeeld. Banners zijn alleen voor de looks: ze geven geen punten of XP.
      </p>

      <BannerGrid owned={[...owned]} equipped={equipped} stats={stats} />
    </div>
  );
}
