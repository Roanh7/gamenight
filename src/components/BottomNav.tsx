"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ActiveNight } from "@/lib/data";
import { PixelIcon, type PixelIconName } from "./PixelIcon";
import { playClick, soundOn } from "@/lib/sfx";

const ITEMS: { href: string; label: string; icon: PixelIconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" || p.startsWith("/nieuws") },
  { href: "/agenda", label: "Agenda", icon: "calendar", match: (p) => p.startsWith("/agenda") },
  { href: "/games", label: "Games", icon: "gamepad", match: (p) => p.startsWith("/games") },
  { href: "/spelers", label: "Players", icon: "players", match: (p) => p.startsWith("/spelers") || p.startsWith("/account") },
  { href: "/ranking", label: "Ranking", icon: "trophy", match: (p) => p.startsWith("/ranking") || p.startsWith("/records") },
];

/** Eén knop van het zwevende menu. */
function Key({ href, label, icon, active, accent }: { href: string; label: string; icon: PixelIconName; active: boolean; accent?: boolean }) {
  return (
    <li className="min-w-0">
      <Link
        href={href}
        className={`dock-key ${active ? "is-on" : ""} ${accent ? "is-accent" : ""}`}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          if (!active && soundOn()) playClick();
        }}
      >
        <PixelIcon name={icon} size={22} />
        <span className="dock-label">{label}</span>
      </Link>
    </li>
  );
}

const ROLE = { host: "👑 Host", cohost: "🎙️ Co-host", player: "👀 Kijkt mee" } as const;

function setNavCookie(value: string | null) {
  document.cookie = value
    ? `gn-nav=${value}; path=/; max-age=${60 * 60 * 36}; samesite=lax`
    : "gn-nav=; path=/; max-age=0; samesite=lax";
}

/**
 * Zwevend menu onderaan (zoals in A-Team Wrapped), in Game Night-stijl: een afgeronde balk met dikke rand,
 * pixel-iconen met label en een geel "pilletje" achter de actieve knop.
 * Tijdens een avond waar je bij bent: de live-variant met een rood strookje erboven.
 */
export function BottomNav({ live, liveOff }: { live: ActiveNight | null; liveOff: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);

  // Hoogte van de balk doorgeven, zodat knoppen onderaan er precies boven blijven
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--nav-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [live, liveOff]);

  function toggle(off: boolean) {
    if (!live) return;
    setNavCookie(off ? `normal:${live.id}` : null);
    router.refresh();
  }

  const shell = "dock-wrap";

  if (live && !liveOff) {
    const isHost = live.role !== "player";
    const items: { href: string; label: string; icon: PixelIconName; active: boolean; accent?: boolean }[] = [
      { href: "/live", label: "Live", icon: "live", active: path === "/live" },
      { href: `/agenda/${live.id}`, label: "Avond", icon: "calendar", active: path === `/agenda/${live.id}` },
      ...(isHost ? [{ href: `/agenda/${live.id}/host#potje`, label: "Potje", icon: "plus" as const, active: false, accent: true }] : []),
      { href: "/ranking", label: "Ranking", icon: "trophy", active: path.startsWith("/ranking") },
    ];
    return (
      <nav ref={ref} className={shell} aria-label="Live-menu">
        <Link href="/live" className="dock-strip bg-red">
          <span className="pixel truncate text-[10px]">
            <span className="blink">●</span> {live.practice ? "OEFENING" : "LIVE"} · {live.title.toUpperCase()}
          </span>
          <span className="shrink-0 text-[11px] font-black">
            {ROLE[live.role]}
            {live.liveMatches ? ` · ${live.liveMatches} bezig` : ""}
          </span>
        </Link>
        <ul className={`dock ${isHost ? "grid-cols-5" : "grid-cols-4"}`}>
          {items.map((it) => (
            <Key key={it.label} {...it} />
          ))}
          <li className="min-w-0">
            <button type="button" onClick={() => toggle(true)} className="dock-key" aria-label="Terug naar het gewone menu">
              <PixelIcon name="grid" size={22} />
              <span className="dock-label">Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav ref={ref} className={shell} aria-label="Hoofdmenu">
      {live && (
        <button
          type="button"
          onClick={() => toggle(false)}
          className="dock-strip bg-night"
        >
          <span className="pixel truncate text-[10px]">
            <span className="blink text-red">●</span> {live.title.toUpperCase()} IS BEZIG
          </span>
          <span className="shrink-0 text-[11px] font-black underline">Terug naar live</span>
        </button>
      )}
      <ul className="dock grid-cols-5">
        {ITEMS.map(({ href, label, icon, match }) => (
          <Key key={href} href={href} label={label} icon={icon} active={match(path)} />
        ))}
      </ul>
    </nav>
  );
}
