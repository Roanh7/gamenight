import "server-only";
import webpush from "web-push";
import { after } from "next/server";
import { createClient as createPlainClient } from "@supabase/supabase-js";

export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured = false;
function ready() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv || !process.env.PUSH_SECRET) return false;
  if (!configured) {
    webpush.setVapidDetails("mailto:gamenight@example.invalid", pub, priv);
    configured = true;
  }
  return true;
}

/** Losse client zonder inlog: de rechten komen van de geheime sleutel. */
function db() {
  return createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Stuurt een melding naar de toestellen van deze spelers (of iedereen als `users` null is),
 * behalve naar `except`. Gooit nooit een fout: een melding mag de app niet laten haperen.
 */
export async function sendPush(users: string[] | null, message: PushMessage, except?: string | null) {
  if (!ready()) return 0;
  const targets = users?.filter((u) => u && u !== except) ?? null;
  if (targets && targets.length === 0) return 0;
  const client = db();
  const { data, error } = await client.rpc("push_targets", {
    p_secret: process.env.PUSH_SECRET!,
    p_users: targets,
  });
  if (error || !data) return 0;
  const subs = (data as { user_id: string; endpoint: string; p256dh: string; auth: string }[]).filter(
    (s) => s.user_id !== except,
  );
  const payload = JSON.stringify(message);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 6,
          urgency: "normal",
        });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: het toestel heeft de meldingen uitgezet of de app verwijderd
        if (code === 404 || code === 410) {
          await client.rpc("push_forget", { p_secret: process.env.PUSH_SECRET!, p_endpoint: s.endpoint });
        }
      }
    }),
  );
  return sent;
}

/** Zelfde als sendPush, maar pas nadat de pagina al terug is (de gebruiker wacht er niet op). */
export function pushLater(users: string[] | null, message: PushMessage, except?: string | null) {
  after(async () => {
    try {
      await sendPush(users, message, except);
    } catch {
      // meldingen zijn een extraatje
    }
  });
}

export function dateNl(iso: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
}
