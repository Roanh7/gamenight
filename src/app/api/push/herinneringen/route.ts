import { createClient } from "@supabase/supabase-js";
import { dateNl, sendPush } from "@/lib/push";

/**
 * Wordt elke 10 minuten aangeroepen door de database (pg_cron).
 * Stuurt een herinnering naar iedereen die zich heeft aangemeld voor een avond die over ±1 uur begint.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  if (!secret || request.headers.get("x-push-secret") !== secret) {
    return new Response("Geen toegang", { status: 401 });
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("due_reminders", { p_secret: secret });
  if (error) return Response.json({ ok: false }, { status: 500 });

  let sent = 0;
  for (const n of (data ?? []) as { night_id: string; title: string; starts_at: string; location: string | null; user_ids: string[] }[]) {
    sent += await sendPush(n.user_ids, {
      title: `⏰ Over een uur: ${n.title}`,
      body: `${dateNl(n.starts_at)}${n.location ? ` · ${n.location}` : ""}. Zet de snacks maar klaar!`,
      url: `/agenda/${n.night_id}`,
      tag: `herinnering-${n.night_id}`,
    });
  }
  return Response.json({ ok: true, nights: data?.length ?? 0, sent });
}
