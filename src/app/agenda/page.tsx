import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Plus } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getAttendanceExtras, getProfiles, getResults } from "@/lib/data";
import { attendanceBoard, attendanceModel, ATTENDANCE_MIN_NIGHTS } from "@/lib/attendance";
import { AttendanceBoard, MyAttendance, MyNightLine } from "@/components/Attendance";
import type { GameNight, Participant } from "@/lib/types";
import { NightCard } from "@/components/NightCard";
import { hoursAgoIso } from "@/lib/format";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { createPracticeNight } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage(props: PageProps<"/agenda">) {
  const sp = await props.searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: nightsData }, { data: partData }, profiles, results, extras] = await Promise.all([
    supabase.from("game_nights").select("*").order("starts_at", { ascending: true }),
    supabase.from("participants").select("night_id, user_id, status"),
    getProfiles(supabase),
    getResults(supabase),
    getAttendanceExtras(supabase),
  ]);
  // Oefenavonden ziet alleen wie hem maakte of host is
  const mineOnly = (n: GameNight) =>
    !n.is_practice || [n.host_id, n.cohost_id, n.created_by].includes(me?.user.id ?? "");
  const nights = ((nightsData ?? []) as GameNight[]).filter(mineOnly);
  const parts = (partData ?? []) as Participant[];

  // 📅 Aanwezigheid (los van XP/records/banners): meegespeeld of door de host aanwezig gezet
  const model = attendanceModel({
    nights: (nightsData ?? []) as GameNight[],
    results,
    participants: parts,
    declines: extras.declines,
    marks: extras.marks,
  });
  const myStats = me ? model.stats(me.user.id, me.profile.created_at) : null;
  const board = attendanceBoard(profiles.list.map((p) => model.stats(p.id, p.created_at)));
  const relevantIds = new Set(model.relevant.map((n) => n.id));
  const declinedByMe = new Set(extras.declines.filter((d) => d.user_id === me?.user.id).map((d) => d.night_id));
  // Punten en potjes per avond per speler (voor "jouw resultaat")
  const perNight = new Map<string, Map<string, { points: number; played: number }>>();
  for (const r of results) {
    if (!r.night_id) continue;
    const m = perNight.get(r.night_id) ?? new Map<string, { points: number; played: number }>();
    const x = m.get(r.user_id) ?? { points: 0, played: 0 };
    x.points += Number(r.league_points);
    x.played += 1;
    m.set(r.user_id, x);
    perNight.set(r.night_id, m);
  }
  const myLine = (n: GameNight) => {
    if (!me || !relevantIds.has(n.id)) return undefined;
    const status = model.status(n.id, me.user.id);
    const table = perNight.get(n.id);
    const mine = table?.get(me.user.id);
    const place = mine ? 1 + [...(table?.values() ?? [])].filter((o) => o.points > mine.points).length : undefined;
    return <MyNightLine status={status} place={place} points={mine?.points} played={mine?.played} />;
  };

  const cutoff = Date.parse(hoursAgoIso(12));
  const upcoming = nights.filter(
    (n) => n.status === "live" || (n.status === "planned" && new Date(n.starts_at).getTime() >= cutoff),
  );
  const past = nights
    .filter((n) => !upcoming.includes(n))
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at));

  const card = (n: GameNight) => {
    const ps = parts.filter((p) => p.night_id === n.id);
    const people = ps.map((p) => profiles.byId.get(p.user_id)).filter(Boolean) as NonNullable<
      ReturnType<typeof profiles.byId.get>
    >[];
    const mine = ps.find((p) => p.user_id === me?.user.id);
    return (
      <li key={n.id}>
        <NightCard
          night={n}
          host={profiles.byId.get(n.host_id)}
          people={people}
          myStatus={mine?.status ?? (declinedByMe.has(n.id) ? "declined" : null)}
          extra={myLine(n)}
        />
      </li>
    );
  };

  return (
    <div>
      <PageHeader
        kicker="AGENDA"
        title="Gamenights"
        action={
          <Link href="/agenda/nieuw" className="btn btn-primary btn-sm">
            <Plus size={16} strokeWidth={3} /> Plan
          </Link>
        }
      />
      <Flash sp={sp} />
      {myStats && <MyAttendance s={myStats} />}

      {upcoming.length ? (
        <ul className="grid grid-cols-1 gap-3 [&>li]:min-w-0">{upcoming.map(card)}</ul>
      ) : (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title="Geen gamenights gepland"
          text="Plan de eerste en nodig de rest uit."
          action={
            <Link href="/agenda/nieuw" className="btn btn-primary btn-sm">
              <Plus size={16} strokeWidth={3} /> Plan een avond
            </Link>
          }
        />
      )}

      <form action={createPracticeNight} className="card mt-4 flex items-center gap-3 p-4">
        <span className="text-3xl" aria-hidden>
          🧪
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black">Oefenavond</p>
          <p className="text-xs font-bold text-muted">
            Probeer potjes starten, scores invoeren en afronden. Telt niet mee voor ranking, XP of nieuws, en niemand
            krijgt een melding.
          </p>
        </div>
        <SubmitButton className="btn btn-yellow btn-sm shrink-0" pendingText="…">
          Oefenen
        </SubmitButton>
      </form>

      <SectionTitle>🏆 Most loyal players</SectionTitle>
      <p className="-mt-1 mb-2.5 text-xs font-bold text-muted">
        Aanwezigheid sinds je lid bent: meegespeeld of door de host aanwezig gezet. Op de ranglijst vanaf {ATTENDANCE_MIN_NIGHTS} avonden.
      </p>
      <AttendanceBoard ranked={board.ranked} unranked={board.unranked} profiles={profiles.byId} meId={me?.user.id} />

      {past.length > 0 && (
        <>
          <SectionTitle>Geweest</SectionTitle>
          <ul className="grid grid-cols-1 gap-3 [&>li]:min-w-0">{past.map(card)}</ul>
        </>
      )}
    </div>
  );
}
