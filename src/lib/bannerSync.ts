import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import type { createClient } from "./supabase/server";
import { bannerDiff, bannerStats, BANNER_BY_ID, DEFAULT_BANNER, FREE_BANNERS, type BannerStats } from "./banners";
import { frameDiff } from "./frames";
import type { ResultRow } from "./stats";
import type { Attendance, XpInfo } from "./xp";

type DB = Awaited<ReturnType<typeof createClient>>;

export type UnlockRow = { user_id: string; banner_id: string; revoked_at: string | null; seen: boolean; unlocked_at: string };

/**
 * Houdt de vrijgespeelde banners (en avatar-frames) van álle spelers gelijk aan hun geschiedenis.
 * - Nieuw verdiend → vrijgeven (met nieuwsbericht bij EPIC en hoger, maar één keer).
 * - Na een gecorrigeerde uitslag niet meer verdiend → intrekken (niet tijdens een lopend/heropend potje).
 * Alleen de server kan dit (geheime sleutel). Schrijft alleen als er echt iets verandert.
 */
export async function syncBanners(
  supabase: DB,
  input: { userIds: string[]; results: ResultRow[]; attendance: Attendance[]; xpOf: (u: string) => XpInfo },
): Promise<{ rows: UnlockRow[]; statsOf: (u: string) => BannerStats }> {
  const statsOf = bannerStats(input.results, input.attendance, (u) => input.xpOf(u).level);
  const { data } = await supabase.from("banner_unlocks").select("user_id, banner_id, revoked_at, seen, unlocked_at").limit(5000);
  let rows = (data ?? []) as UnlockRow[];
  const b = bannerDiff(input.userIds, statsOf, rows);
  const f = frameDiff(input.userIds, statsOf, rows); // avatar-frames: zelfde opslag, nooit een nieuwsbericht
  const grant = [...b.grant, ...f.grant];
  const revoke = [...b.revoke, ...f.revoke];

  let toRevoke = revoke;
  if (revoke.length) {
    const { count } = await supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live");
    if (count) toRevoke = [];
  }
  const secret = process.env.PUSH_SECRET?.trim();
  if ((grant.length || toRevoke.length) && secret) {
    const client = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.rpc("sync_banners", { p_secret: secret, p_grant: grant, p_revoke: toRevoke });
    if (error) console.error("[banners] sync", error.message);
    else {
      const { data: fresh } = await supabase.from("banner_unlocks").select("user_id, banner_id, revoked_at, seen, unlocked_at").limit(5000);
      rows = (fresh ?? []) as UnlockRow[];
    }
  }
  return { rows, statsOf };
}

/** Welke banners iemand nu heeft (de gratis starter-banners altijd). */
export function ownedBanners(rows: UnlockRow[], userId: string) {
  const set = new Set<string>(FREE_BANNERS);
  for (const r of rows) if (r.user_id === userId && !r.revoked_at && BANNER_BY_ID.has(r.banner_id)) set.add(r.banner_id);
  return set;
}

/** De banner die je ziet: de gekozen banner als die (nog) vrijgespeeld is, anders Rookie Fields. */
export function shownBanner(chosen: string | null | undefined, owned: Set<string>) {
  return chosen && owned.has(chosen) ? chosen : DEFAULT_BANNER;
}

/** Nieuwe banners waarvan je de animatie nog niet zag (oudste eerst). */
export function unseenBanners(rows: UnlockRow[], userId: string) {
  return rows
    .filter((r) => r.user_id === userId && !r.seen && !r.revoked_at && BANNER_BY_ID.has(r.banner_id))
    .sort((a, b) => a.unlocked_at.localeCompare(b.unlocked_at))
    .map((r) => r.banner_id);
}
