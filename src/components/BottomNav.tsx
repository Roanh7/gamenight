"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Gamepad2, House, Trophy, Users } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" || p.startsWith("/nieuws") },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, match: (p: string) => p.startsWith("/agenda") },
  { href: "/games", label: "Games", icon: Gamepad2, match: (p: string) => p.startsWith("/games") },
  { href: "/spelers", label: "Players", icon: Users, match: (p: string) => p.startsWith("/spelers") || p.startsWith("/account") },
  { href: "/ranking", label: "Ranking", icon: Trophy, match: (p: string) => p.startsWith("/ranking") },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center gap-1 py-2.5"
                aria-current={active ? "page" : undefined}
              >
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
