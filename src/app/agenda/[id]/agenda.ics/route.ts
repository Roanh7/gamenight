import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export async function GET(request: NextRequest, ctx: RouteContext<"/agenda/[id]/agenda.ics">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: night } = await supabase
    .from("game_nights")
    .select("id, title, starts_at, location, notes, host_id")
    .eq("id", id)
    .maybeSingle();
  if (!night) return new NextResponse("Niet gevonden", { status: 404 });

  const { data: host } = await supabase.from("profiles").select("username").eq("id", night.host_id).maybeSingle();

  const start = new Date(night.starts_at);
  const end = new Date(start.getTime() + 4 * 3600_000);
  const url = `${new URL(request.url).origin}/agenda/${night.id}`;
  const description = [
    host ? `Host: ${host.username}` : null,
    night.notes,
    `Stem en meld je aan: ${url}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Game Night//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${night.id}@gamenight`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${esc(`🎮 ${night.title}`)}`,
    night.location ? `LOCATION:${esc(night.location)}` : null,
    `DESCRIPTION:${esc(description)}`,
    `URL:${url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`${night.title} begint over 2 uur`)}`,
    "TRIGGER:-PT2H",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="gamenight.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
