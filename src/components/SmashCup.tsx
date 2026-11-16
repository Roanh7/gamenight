import Link from "next/link";
import type { Profile } from "@/lib/types";
import type { CupStats } from "@/lib/smashCup";
import { reignLabel } from "@/lib/smashCup";
import { Avatar } from "./Avatar";
import { CupIcon } from "./CupIcon";

/** "30 december 2025" */
export function cupDate(d: string, withYear = true) {
  const [y, m, day] = d.split("-").map(Number);
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, day)),
  );
}

/** Klein goudkleurig label: deze avond is (of was) de Championship Cup */
export function SmashCupChip({ className = "" }: { className?: string }) {
  return (
    <span className={`cup-chip ${className}`}>
      <CupIcon size={12} title={null} /> SMASH CUP
    </span>
  );
}

/**
 * Kaart van de wisselbeker: wie hem nu heeft en sinds wanneer.
 * Gebruikt op Ranking, op de avondpagina van een Cup en bij de volgende Cup op Home.
 */
export function SmashCupCard({
  stats,
  profiles,
  title = "SMASH BROS CHAMPIONSHIP CUP",
  href = "/smash-cup",
  linkLabel = "SMASH CUP HISTORY ▶",
  children,
  today,
}: {
  stats: CupStats;
  profiles: Map<string, Profile>;
  title?: string;
  href?: string | null;
  linkLabel?: string;
  children?: React.ReactNode;
  today: string;
}) {
  const champ = stats.champion ? profiles.get(stats.champion) : undefined;
  const mine = stats.champion ? stats.players.get(stats.champion) : undefined;
  const reignDays = stats.championSince ? Math.max(0, (Date.parse(today) - Date.parse(stats.championSince)) / 86_400_000) : 0;
  return (
    <section className="cup-card" aria-label="Smash Bros Championship Cup">
      <div className="cup-card-head">
        <h2 className="pixel flex min-w-0 items-center gap-1.5 truncate text-[10px]">
          <CupIcon size={14} title={null} />
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-3 px-3 py-3">
        {champ ? (
          <>
            <Link href={`/spelers/${encodeURIComponent(champ.username)}`} className="relative shrink-0">
              <Avatar name={champ.username} color={champ.avatar_color} url={champ.avatar_url} emoji={champ.avatar_emoji} pixel={champ.avatar_pixel} frame={champ.avatar_frame} size="lg" />
              <span className="cup-badge" aria-hidden>
                <CupIcon size={18} title={null} />
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <p className="pixel text-[10px] text-[color:var(--cup-text)]">🏆 REIGNING SMASH CHAMPION</p>
              <p className="flex min-w-0 items-center gap-1.5 text-lg font-black leading-tight">
                <span className="truncate">{champ.username}</span>
                <CupIcon size={16} />
              </p>
              <p className="text-xs font-bold text-muted">
                Sinds {cupDate(stats.championSince!)} · {reignLabel(Math.round(reignDays))}
                {mine ? ` · ${mine.cups} ${mine.cups === 1 ? "cup" : "cups"}` : ""}
                {mine && mine.defenses ? ` · ${mine.defenses}× verdedigd` : ""}
              </p>
            </div>
          </>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="font-black">Nog geen kampioen</p>
            <p className="text-xs font-bold text-muted">De eerste Championship Cup bepaalt wie de wisselbeker krijgt.</p>
          </div>
        )}
      </div>
      {children}
      {href && (
        <Link href={href} className="cup-card-foot">
          {linkLabel}
        </Link>
      )}
    </section>
  );
}
