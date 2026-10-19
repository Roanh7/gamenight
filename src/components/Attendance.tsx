import Link from "next/link";
import type { Profile } from "@/lib/types";
import { ATTENDANCE_MIN_NIGHTS, formatPct, monthLabel, type AttStats, type AttStatus } from "@/lib/attendance";
import { Avatar } from "./Avatar";
import { RankBadge } from "./ui";

/** 📅 MY ATTENDANCE — bovenaan de Agenda. */
export function MyAttendance({ s }: { s: AttStats }) {
  const tiles: [string, string, string][] = [
    ["🎮", String(s.attended), "ERBIJ"],
    ["❌", String(s.missed), "GEMIST"],
    ["📈", s.pct === null ? "–" : `${formatPct(s.pct)}%`, "AANWEZIG"],
    ["🔥", String(s.current), "REEKS"],
    ["⭐", String(s.longest), "RECORD"],
  ];
  return (
    <section id="attendance" className="att-card mb-4 scroll-mt-20" aria-label="Mijn aanwezigheid">
      <p className="att-sign pixel">📅 MY ATTENDANCE</p>
      {s.relevant === 0 ? (
        <p className="px-1 pb-1 pt-2 text-center text-sm font-bold">
          Nog geen afgesloten gamenights sinds je lid bent. Na je eerste avond staan hier je cijfers.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-6 gap-1.5">
            {tiles.map(([icon, value, label]) => (
              <li key={label} className={`att-tile ${label === "AANWEZIG" ? "col-span-2" : ""}`}>
                <span className="text-sm leading-none" aria-hidden>
                  {icon}
                </span>
                <span className="pixel mt-1 max-w-full truncate text-[11px] leading-none">{value}</span>
                <span className="pixel mt-1 text-[6px] leading-tight opacity-75">{label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center text-[11px] font-bold opacity-90">
            {s.activeMonths.length
              ? `🗓️ Actiefste maand: ${s.activeMonths.map(monthLabel).join(" & ")} (${s.activeCount}×)`
              : "🗓️ Actiefste maand: nog geen"}
            {s.missed > 0 && (
              <span className="block opacity-80">
                Gemist: {[s.noshow && `${s.noshow}× niet gekomen`, s.declined && `${s.declined}× afgemeld`, s.noreply && `${s.noreply}× niet gereageerd`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </p>
        </>
      )}
    </section>
  );
}

/** Persoonlijk resultaat op een afgesloten avond (in de Agenda-kaart). */
export function MyNightLine({ status, place, points, played }: { status: AttStatus; place?: number; points?: number; played?: number }) {
  if (status === "present") {
    return (
      <span className="att-line bg-green-soft">
        🟢 <b>AANWEZIG</b>
        {played ? (
          <>
            {" "}· 🏆 {place}e · ⭐ {points} pt · 🎮 {played} {played === 1 ? "potje" : "potjes"}
          </>
        ) : (
          " · speelde niet mee"
        )}
      </span>
    );
  }
  if (status === "noshow") return <span className="att-line bg-red-soft">🔴 <b>NIET GEKOMEN</b> · wel aangemeld</span>;
  if (status === "declined") return <span className="att-line bg-soft">🙅 <b>AFGEMELD</b></span>;
  return <span className="att-line bg-soft">⚪ <b>NIET DEELGENOMEN</b></span>;
}

/** 🏆 MOST LOYAL PLAYERS — aanwezigheid sinds lidmaatschap. */
export function AttendanceBoard({
  ranked,
  unranked,
  profiles,
  meId,
}: {
  ranked: (AttStats & { rank: number })[];
  unranked: AttStats[];
  profiles: Map<string, Profile>;
  meId?: string;
}) {
  if (!ranked.length && !unranked.length) {
    return <p className="card px-4 py-3 text-sm font-bold text-muted">Nog geen afgesloten gamenights. Na de eerste avond verschijnt hier de ranglijst.</p>;
  }
  const row = (s: AttStats, rank: number | null) => {
    const p = profiles.get(s.user_id);
    return (
      <li key={s.user_id} className={`flex items-center gap-2.5 px-3 py-2 ${s.user_id === meId ? "bg-yellow-soft" : ""}`}>
        {rank ? <RankBadge rank={rank} /> : <span className="w-8 text-center text-sm">🔒</span>}
        <Avatar name={p?.username ?? "?"} color={p?.avatar_color} url={p?.avatar_url} emoji={p?.avatar_emoji} size="sm" crown={rank === 1} />
        <Link href={p ? `/spelers/${p.username}` : "#"} className="min-w-0 flex-1">
          <span className="block truncate font-black">{p?.username ?? "Oud-speler"}</span>
          <span className="block text-[11px] font-bold text-muted">
            {s.attended} van {s.relevant} {s.relevant === 1 ? "avond" : "avonden"}
            {rank ? (s.current > 1 ? ` · 🔥 ${s.current} op rij` : "") : ` · nog ${ATTENDANCE_MIN_NIGHTS - s.relevant} voor de ranglijst`}
          </span>
        </Link>
        <span className={`pixel shrink-0 text-[11px] ${rank ? "" : "text-muted"}`}>{formatPct(s.pct)}%</span>
      </li>
    );
  };
  return (
    <div className="card overflow-hidden">
      <ol className="divide-y-2 divide-soft">{ranked.map((s) => row(s, s.rank))}</ol>
      {unranked.length > 0 && (
        <div className="border-t-2 border-line bg-cream/60">
          <p className="pixel px-3 pt-2 text-[8px] text-muted">🔒 NOG TE WEINIG AVONDEN (MIN. {ATTENDANCE_MIN_NIGHTS})</p>
          <ul className="divide-y-2 divide-soft">{unranked.map((s) => row(s, null))}</ul>
        </div>
      )}
    </div>
  );
}

/** Klein blok voor de Player Hub. */
export function HubAttendance({ s }: { s: AttStats }) {
  return (
    <Link href="/agenda#attendance" className="att-hub card mt-3 flex items-center gap-3 px-3 py-2.5">
      <span className="text-xl" aria-hidden>
        📅
      </span>
      <span className="min-w-0 flex-1">
        <span className="pixel block text-[8px] text-muted">MY ATTENDANCE</span>
        {s.relevant ? (
          <span className="block truncate text-sm font-black">
            🎮 {s.attended} {s.attended === 1 ? "avond" : "avonden"} · 📊 {formatPct(s.pct)}% · 🔥 {s.current} op rij
          </span>
        ) : (
          <span className="block truncate text-sm font-bold text-muted">Nog geen afgesloten gamenights</span>
        )}
      </span>
      <span className="text-lg font-black" aria-hidden>
        ›
      </span>
    </Link>
  );
}
