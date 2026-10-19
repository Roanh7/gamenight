"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/account", icon: "🕹️", label: "My Profile" },
  { href: "/account#customize", icon: "🎨", label: "Customize Player" },
  { href: "/account#trofeekast", icon: "🏅", label: "Achievements" },
  { href: "/account/banners", icon: "🖼️", label: "Profile Banners" },
  { href: "/nieuws", icon: "📰", label: "Game Night News" },
  { href: "/account#instellingen", icon: "⚙️", label: "Settings" },
  { href: "/uitleg", icon: "❓", label: "Help & Rules" },
] as const;

/**
 * 👾 PLAYER MENU — klapt open onder je avatar rechtsboven.
 * Sluit bij een tik erbuiten, met Escape, of als je naar een andere pagina gaat.
 * Pijltjestoetsen (↑/↓, Home/End) lopen door de opties.
 */
export function PlayerMenu({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const path = usePathname();

  // Andere pagina → menu dicht
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const items = () => [...(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    items()[0]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
        return;
      }
      const all = items();
      const i = all.indexOf(document.activeElement as HTMLAnchorElement);
      if (e.key === "ArrowDown") all[(i + 1) % all.length]?.focus();
      else if (e.key === "ArrowUp") all[(i - 1 + all.length) % all.length]?.focus();
      else if (e.key === "Home") all[0]?.focus();
      else if (e.key === "End") all[all.length - 1]?.focus();
      else return;
      e.preventDefault();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Player menu van ${name}`}
        className={`player-menu-btn ${open ? "is-open" : ""}`}
      >
        {children}
      </button>
      {open && (
        <div id={id} className="player-menu" role="menu" aria-label="Player menu">
          <p className="pixel border-b-2 border-line px-3 py-2 text-[9px] text-red">👾 PLAYER MENU</p>
          <ul ref={list} className="p-1.5">
            {ITEMS.map((it) => (
              <li key={it.href} role="none">
                <Link href={it.href} role="menuitem" className="player-menu-item" onClick={() => setOpen(false)}>
                  <span className="player-menu-icon" aria-hidden>
                    {it.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  <span className="player-menu-arrow" aria-hidden>
                    ▶
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
