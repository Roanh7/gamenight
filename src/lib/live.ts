import "server-only";
import { cache } from "react";
import { createClient, getMe } from "./supabase/server";
import { getActiveNight, type ActiveNight } from "./data";

/** De actieve avond voor de ingelogde speler (één keer per verzoek opgehaald). */
export const getMyActiveNight = cache(async (): Promise<ActiveNight | null> => {
  const me = await getMe();
  if (!me) return null;
  return getActiveNight(await createClient(), me.user.id);
});
