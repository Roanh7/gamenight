import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { GameNight, Profile } from "@/lib/types";
import { dayParts, formatTime } from "@/lib/format";
import { Avatar } from "./Avatar";
import { StatusChip } from "./ui";

export function NightCard({
  night,
  host,
  people,
  myStatus,
}: {
  night: GameNight;
  host?: Profile;
  people: Profile[];
  myStatus?: "pending" | "confirmed" | null;
}) {
  const { day, month } = dayParts(night.starts_at);
  const live = night.status === "live";
  return (
    <Link
      href={`/agenda/${night.id}`}
      className={`card flex gap-3 p-3 transition-transform active:translate-y-[2px] ${
        night.status === "cancelled" ? "opacity-60" : ""
      }`}
    >
      <div
        className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-line py-2 ${
          live ? "bg-red text-white" : "bg-yellow-soft"
        }`}
      >
        {night.date_poll && night.status === "planned" ? (
          <>
            <span className="text-xl leading-none">📅</span>
            <span className="mt-1 text-[11px] font-black uppercase">Prikker</span>
          </>
        ) : (
          <>
            <span className="pixel text-base leading-none">{day}</span>
            <span className="mt-1 text-[11px] font-black uppercase">{month}</span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-black">{night.title}</h3>
          <StatusChip status={night.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {night.date_poll && night.status === "planned" ? "Datum nog kiezen" : formatTime(night.starts_at)}
          </span>
          {night.location && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin size={13} /> <span className="truncate">{night.location}</span>
            </span>
          )}
          {host && <span>Host: {host.username}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {people.slice(0, 6).map((p) => (
              <Avatar key={p.id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="xs" />
            ))}
            {people.length > 6 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-line bg-paper text-[10px] font-black">
                +{people.length - 6}
              </span>
            )}
          </div>
          {myStatus === "confirmed" && <span className="chip bg-green-soft">✓ Je bent erbij</span>}
          {myStatus === "pending" && <span className="chip bg-yellow-soft">⏳ Aangemeld</span>}
        </div>
      </div>
    </Link>
  );
}
