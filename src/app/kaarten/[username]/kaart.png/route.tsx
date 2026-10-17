import { createClient } from "@/lib/supabase/server";
import { loadCards } from "@/lib/cards";
import type { EditionId } from "@/lib/player";
import { renderCardPng } from "./render";
import { loadFonts } from "../../../agenda/[id]/recap.png/render";

/** De Player Card als plaatje (1080x1350), om te delen in de groepsapp. */
export async function GET(req: Request, ctx: RouteContext<"/kaarten/[username]/kaart.png">) {
  const { username } = await ctx.params;
  const want = new URL(req.url).searchParams.get("kaart") ?? "";
  const supabase = await createClient();
  const [data, fonts] = await Promise.all([loadCards(supabase), loadFonts()]);
  const p = data.profiles.list.find((x) => x.username.toLowerCase() === decodeURIComponent(username).toLowerCase());
  if (!p) return new Response("Niet gevonden", { status: 404 });
  const { col, nickname, shown } = data.collectionFor(p.id);

  // Gevraagde kaart, als die verdiend is; anders de getoonde kaart
  let edition: EditionId = shown.edition;
  let stats = shown.stats;
  let season: string | null = shown.season;
  if (want.startsWith("season:")) {
    const s = col.seasons.find((x) => `season:${x.season}` === want);
    if (s) {
      edition = s.edition;
      stats = s;
      season = s.season;
    }
  } else if (want in col.earned && col.earned[want as EditionId]) {
    edition = want as EditionId;
    stats = col.current;
    season = null;
  }
  return renderCardPng({
    username: p.username,
    color: p.avatar_color,
    emoji: p.avatar_emoji,
    config: p.avatar_config,
    edition,
    stats,
    season,
    nickname,
    mainIcon: data.iconOf(stats),
    fonts,
  });
}
