import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, Plus } from "lucide-react";
import { createClient, getMe } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import type { GameNight, Participant } from "@/lib/types";
import { NightCard } from "@/components/NightCard";
import { hoursAgoIso } from "@/lib/format";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: nightsData }, { data: partData }, profiles] = await Promise.all([
    supabase.from("game_nights").select("*").order("starts_at", { ascending: true }),
    supabase.from("participants").select("night_id, user_id, status"),
    getProfiles(supabase),
  ]);
  const nights = (nightsData ?? []) as GameNight[];
  const parts = (partData ?? []) as Participant[];

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
          myStatus={mine?.status ?? null}
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

      {past.length > 0 && (
        <>
          <SectionTitle>Geweest</SectionTitle>
          <ul className="grid grid-cols-1 gap-3 [&>li]:min-w-0">{past.map(card)}</ul>
        </>
      )}
    </div>
  );
}
