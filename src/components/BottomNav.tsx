"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ActiveNight } from "@/lib/data";
import { PixelIcon, type PixelIconName } from "./PixelIcon";

const ITEMS: { href: string; label: string; icon: PixelIconName; match: (p: string) => boolean }[] = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" || p.startsWith("/nieuws") },
  { href: "/agenda", label: "Agenda", icon: "calendar", match: (p) => p.startsWith("/agenda") },
  { href: "/games", label: "Games", icon: "gamepad", match: (p) => p.startsWith("/games") },
  { href: "/spelers", label: "Players", icon: "players", match: (p) => p.startsWith("/spelers") || p.startsWith("/account") },
  { href: "/ranking", label: "Ranking", icon: "trophy", match: (p) => p.startsWith("/ranking") || p.startsWith("/records") },
];

/** Eén knop van het console-menu. */
function Key({ href, label, icon, active, accent }: { href: string; label: string; icon: PixelIconName; active: boolean; accent?: boolean }) {
  return (
    <li className="min-w-0">
      <Link href={href} className={`console-key ${active ? "is-on" : ""} ${accent ? "is-accent" : ""}`} aria-current={active ? "page" : undefined}>
        <PixelIcon name={icon} size={20} />
        <span className="console-label">{label}</span>
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

/** Menubalk onderaan als bedieningspaneel van een spelcomputer. Tijdens een avond waar je bij bent: de live-balk. */
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

  const shell = "console-nav fixed inset-x-0 bottom-0 z-40";
  const safe = { paddingBottom: "env(safe-area-inset-bottom)" };

  if (live && !liveOff) {
    const isHost = live.role !== "player";
    const items: { href: string; label: string; icon: PixelIconName; active: boolean; accent?: boolean }[] = [
      { href: "/live", label: "Live", icon: "live", active: path === "/live" },
      { href: `/agenda/${live.id}`, label: "Avond", icon: "calendar", active: path === `/agenda/${live.id}` },
      ...(isHost ? [{ href: `/agenda/${live.id}/host#potje`, label: "Potje", icon: "plus" as const, active: false, accent: true }] : []),
      { href: "/ranking", label: "Ranking", icon: "trophy", active: path.startsWith("/ranking") },
    ];
    return (
      <nav ref={ref} className={shell} style={safe} aria-label="Live-menu">
        <Link href="/live" className="mx-auto flex h-7 max-w-xl items-center justify-between gap-2 bg-red px-4 text-white">
          <span className="pixel truncate text-[9px]">
            <span className="blink">●</span> {live.practice ? "OEFENING" : "LIVE"} · {live.title.toUpperCase()}
          </span>
          <span className="shrink-0 text-[11px] font-black">
            {ROLE[live.role]}
            {live.liveMatches ? ` · ${live.liveMatches} bezig` : ""}
          </span>
        </Link>
        <ul className={`console-keys ${isHost ? "grid-cols-5" : "grid-cols-4"}`}>
          {items.map((it) => (
            <Key key={it.label} {...it} />
          ))}
          <li className="min-w-0">
            <button type="button" onClick={() => toggle(true)} className="console-key w-full" aria-label="Terug naar het gewone menu">
              <PixelIcon name="grid" size={20} />
              <span className="console-label">Menu</span>
            </button>
          </li>
        </ul>
      </nav>
    );
  }

  return (
    <nav ref={ref} className={shell} style={safe}>
      {live && (
        <button
          type="button"
          onClick={() => toggle(false)}
          className="mx-auto flex h-7 w-full max-w-xl items-center justify-between gap-2 bg-night px-4 text-white"
        >
          <span className="pixel truncate text-[9px]">
            <span className="blink text-red">●</span> {live.title.toUpperCase()} IS BEZIG
          </span>
          <span className="shrink-0 text-[11px] font-black underline">Terug naar live</span>
        </button>
      )}
      <ul className="console-keys grid-cols-5">
        {ITEMS.map(({ href, label, icon, match }) => (
          <Key key={href} href={href} label={label} icon={icon} active={match(path)} />
        ))}
      </ul>
    </nav>
  );
}
