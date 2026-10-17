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
    // Apple wil een echt adres als afzender, anders weigert hij de melding (BadJwtToken)
    webpush.setVapidDetails("https://gamenight-theta.vercel.app", pub.trim(), priv.trim());
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

export type PushReport = { sent: number; devices: number; problems: string[] };

/**
 * Stuurt een melding naar de toestellen van deze spelers (of iedereen als `users` null is),
 * behalve naar `except`. Gooit nooit een fout: een melding mag de app niet laten haperen.
 */
export async function sendPushReport(
  users: string[] | null,
  message: PushMessage,
  except?: string | null,
): Promise<PushReport> {
  const report: PushReport = { sent: 0, devices: 0, problems: [] };
  if (!ready()) {
    report.problems.push("sleutels ontbreken op de server");
    return report;
  }
  const targets = users?.filter((u) => u && u !== except) ?? null;
  if (targets && targets.length === 0) return report;
  const client = db();
  const { data, error } = await client.rpc("push_targets", {
    p_secret: process.env.PUSH_SECRET!.trim(),
    p_users: targets,
  });
  if (error || !data) {
    report.problems.push(`database: ${error?.message ?? "geen antwoord"}`);
    console.error("[push] push_targets", error);
    return report;
  }
  const subs = (data as { user_id: string; endpoint: string; p256dh: string; auth: string }[]).filter(
    (s) => s.user_id !== except,
  );
  report.devices = subs.length;
  const payload = JSON.stringify(message);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 6,
          urgency: "high",
        });
        report.sent++;
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        report.problems.push(`${new URL(s.endpoint).host}: ${err.statusCode ?? ""} ${err.body || err.message || ""}`.trim());
        console.error("[push] versturen mislukt", err.statusCode, err.body || err.message);
        // 404/410: het toestel heeft de meldingen uitgezet of de app verwijderd
        if (err.statusCode === 404 || err.statusCode === 410) {
          await client.rpc("push_forget", { p_secret: process.env.PUSH_SECRET!.trim(), p_endpoint: s.endpoint });
        }
      }
    }),
  );
  return report;
}

export async function sendPush(users: string[] | null, message: PushMessage, except?: string | null) {
  return (await sendPushReport(users, message, except)).sent;
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
