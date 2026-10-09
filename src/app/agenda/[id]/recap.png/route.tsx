import { createClient } from "@/lib/supabase/server";
import { getGames, getNight, getProfiles } from "@/lib/data";
import { computeRecap } from "@/lib/recap";
import { loadFonts, renderRecap } from "./render";

/** Deelbaar plaatje (1080x1350, past mooi in WhatsApp/Insta) met de recap van een avond. */
export async function GET(_req: Request, ctx: RouteContext<"/agenda/[id]/recap.png">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const [data, profiles, games, fonts] = await Promise.all([
    getNight(supabase, id),
    getProfiles(supabase),
    getGames(supabase),
    loadFonts(),
  ]);
  if (!data) return new Response("Niet gevonden", { status: 404 });
  const recap = computeRecap(data.matches, data.results);
  if (!recap) return new Response("Nog geen potjes gespeeld", { status: 404 });

  return renderRecap({
    title: data.night.title,
    startsAt: data.night.starts_at,
    recap,
    fonts,
    name: (uid) => (uid ? (profiles.byId.get(uid)?.username ?? "?") : "—"),
    colorOf: (uid) => profiles.byId.get(uid)?.avatar_color ?? "red",
    gameNames: recap.games.map((g) => games.byId.get(g)?.name).filter(Boolean).join(" · "),
  });
}
