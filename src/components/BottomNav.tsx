"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Gamepad2, House, LayoutGrid, Plus, Radio, Trophy, Users } from "lucide-react";
import type { ActiveNight } from "@/lib/data";

const ITEMS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" || p.startsWith("/nieuws") },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, match: (p: string) => p.startsWith("/agenda") },
  { href: "/games", label: "Games", icon: Gamepad2, match: (p: string) => p.startsWith("/games") },
  { href: "/spelers", label: "Players", icon: Users, match: (p: string) => p.startsWith("/spelers") || p.startsWith("/account") || p.startsWith("/kaarten") },
  { href: "/ranking", label: "Ranking", icon: Trophy, match: (p: string) => p.startsWith("/ranking") || p.startsWith("/records") },
];

const ROLE = { host: "👑 Host", cohost: "🎙️ Co-host", player: "👀 Kijkt mee" } as const;

function setNavCookie(value: string | null) {
  document.cookie = value
    ? `gn-nav=${value}; path=/; max-age=${60 * 60 * 36}; samesite=lax`
    : "gn-nav=; path=/; max-age=0; samesite=lax";
}

/** Menubalk onderaan. Tijdens een avond waar je bij bent: de live-balk. */
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

  const shell = "fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-paper";
  const safe = { paddingBottom: "env(safe-area-inset-bottom)" };

  if (live && !liveOff) {
    const isHost = live.role !== "player";
    const items = [
      { href: "/live", label: "Live", icon: Radio, active: path === "/live" },
      { href: `/agenda/${live.id}`, label: "Avond", icon: CalendarDays, active: path === `/agenda/${live.id}` },
      ...(isHost ? [{ href: `/agenda/${live.id}/host#potje`, label: "Potje", icon: Plus, active: false, big: true }] : []),
      { href: "/ranking", label: "Ranking", icon: Trophy, active: path.startsWith("/ranking") },
    ];
    return (
      <nav ref={ref} className={shell} style={safe} aria-label="Live-menu">
        <Link href="/live" className="mx-auto flex h-7 max-w-xl items-center justify-between gap-2 bg-red px-4 text-white">
          <span className="pixel truncate text-[9px]">
            <span className="blink">●</span> LIVE · {live.title.toUpperCase()}
          </span>
          <span className="shrink-0 text-[11px] font-black">
            {ROLE[live.role]}
            {live.liveMatches ? ` · ${live.liveMatches} bezig` : ""}
          </span>
        </Link>
        <ul className={`mx-auto grid h-16 max-w-xl ${isHost ? "grid-cols-5" : "grid-cols-4"}`}>
          {items.map(({ href, label, icon: Icon, active, ...rest }) => (
            <li key={label} className="flex items-center justify-center">
              {"big" in rest ? (
                <Link
                  href={href}
                  className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-line bg-yellow text-night shadow-[0_4px_0_var(--color-line)] active:translate-y-[2px]"
                  aria-label="Nieuw potje starten"
                >
                  <Icon size={22} strokeWidth={3} />
                  <span className="text-[10px] font-black leading-none">{label}</span>
                </Link>
              ) : (
                <Link href={href} className="flex flex-col items-center gap-1" aria-current={active ? "page" : undefined}>
                  <span
                    className={`flex h-8 w-11 items-center justify-center rounded-full border-2 ${
                      active ? "border-line bg-red text-white" : "border-transparent text-muted"
                    }`}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                  </span>
                  <span className={`text-[11px] font-extrabold ${active ? "text-ink" : "text-muted"}`}>{label}</span>
                </Link>
              )}
            </li>
          ))}
          <li className="flex items-center justify-center">
            <button type="button" onClick={() => toggle(true)} className="flex flex-col items-center gap-1" aria-label="Terug naar het gewone menu">
              <span className="flex h-8 w-11 items-center justify-center rounded-full border-2 border-transparent text-muted">
                <LayoutGrid size={20} strokeWidth={2.5} />
              </span>
              <span className="text-[11px] font-extrabold text-muted">Menu</span>
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
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link href={href} className="flex flex-col items-center gap-1 py-2.5" aria-current={active ? "page" : undefined}>
                <span
                  className={`flex h-8 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? "border-line bg-red text-white" : "border-transparent text-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={2.5} />
                </span>
                <span className={`text-[11px] font-extrabold ${active ? "text-ink" : "text-muted"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
