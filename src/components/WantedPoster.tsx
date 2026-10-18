import Link from "next/link";
import type { Profile } from "@/lib/types";
import type { WantedLevel } from "@/lib/wanted";
import { BG, TEXT_ON, safeColor } from "@/lib/colors";

const HEADLINE: Record<WantedLevel["id"], string> = {
  wanted: "WANTED!",
  most_wanted: "MOST WANTED!",
  public_enemy: "PUBLIC ENEMY #1",
};

function Face({ p, className }: { p: Profile; className: string }) {
  const c = safeColor(p.avatar_color);
  return p.avatar_emoji ? (
    <span className={`${className} flex items-center justify-center leading-none`} aria-hidden>
      {p.avatar_emoji}
    </span>
  ) : (
    <span className={`${className} ${BG[c]} ${TEXT_ON[c]} pixel flex items-center justify-center border-2 border-[#3b2a14] uppercase`} aria-hidden>
      {p.username.slice(0, 1)}
    </span>
  );
}

/** De Wanted-poster: wie een winstreeks heeft, met de premie op zijn hoofd. */
export function WantedPoster({ profile, streak, level, isMe }: { profile: Profile; streak: number; level: WantedLevel; isMe?: boolean }) {
  return (
    <section className={`wanted-poster wanted-${level.id} relative mx-auto w-full max-w-[300px] px-5 pb-5 pt-4 text-center`} aria-label={`${HEADLINE[level.id]} ${profile.username}, ${streak} zeges op rij`}>
      <span className="wanted-nail left-3" aria-hidden />
      <span className="wanted-nail right-3" aria-hidden />
      <p className="pixel text-[8px] tracking-widest opacity-80">GAME NIGHT PRESENTS</p>
      <h2 className="wanted-title pixel mt-2 leading-tight">{HEADLINE[level.id]}</h2>
      <div className="wanted-frame mx-auto mt-3 flex h-28 w-28 items-center justify-center">
        <Face p={profile} className="h-24 w-24 text-[64px]" />
      </div>
      <p className="pixel mt-3 truncate text-lg uppercase">{profile.username}</p>
      <p className="mt-1 text-sm font-black">🔥 {streak} WIN STREAK</p>
      <div className="wanted-reward mx-auto mt-3 py-1.5">
        <p className="pixel text-[8px]">BOUNTY REWARD</p>
        <p className="pixel mt-1 text-xl">+{level.xp} XP</p>
      </div>
      <p className="mt-3 text-xs font-black">
        {isMe ? "Er staat een premie op jouw hoofd. Blijf winnen!" : "Versla deze speler en claim de premie!"}
      </p>
    </section>
  );
}

/** Kleine versie voor Home en de live-avond. */
export function WantedStrip({ items }: { items: { profile: Profile; streak: number; level: WantedLevel }[] }) {
  if (!items.length) return null;
  return (
    <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {items.map(({ profile, streak, level }) => (
        <li key={profile.id} className="shrink-0">
          <Link href={`/spelers/${encodeURIComponent(profile.username)}`} className="wanted-poster wanted-mini flex w-[150px] flex-col items-center px-3 pb-3 pt-2 text-center">
            <span className="pixel text-[8px]">{level.id === "wanted" ? "WANTED" : level.id === "most_wanted" ? "MOST WANTED" : "PUBLIC ENEMY"}</span>
            <Face p={profile} className="mt-1.5 h-12 w-12 text-[34px]" />
            <span className="mt-1.5 w-full truncate text-sm font-black">{profile.username}</span>
            <span className="text-[11px] font-black">🔥 {streak} op rij</span>
            <span className="pixel mt-1 text-[10px]">+{level.xp} XP</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
