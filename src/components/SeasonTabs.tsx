import Link from "next/link";
import { currentSeason, seasonLabel } from "@/lib/stats";

/** Kies seizoen: huidig, eerdere seizoenen of all-time (via ?seizoen=). */
export function SeasonTabs({
  seasons,
  active,
  basePath,
}: {
  seasons: string[];
  active: string;
  basePath: string;
}) {
  const now = currentSeason();
  const items = [...seasons.map((s) => [s, s === now ? `Nu · ${seasonLabel(s)}` : seasonLabel(s)]), ["all", "All-time"]];
  return (
    <nav className="-mx-4 mb-1 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Seizoen">
      {items.map(([key, label]) => (
        <Link
          key={key}
          href={key === now ? basePath : `${basePath}?seizoen=${key}`}
          scroll={false}
          aria-current={active === key ? "page" : undefined}
          className={`chip shrink-0 px-3 py-1.5 text-sm ${active === key ? "bg-night text-white" : "bg-paper"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function parseSeason(value: string | string[] | undefined, available: string[]) {
  const v = typeof value === "string" ? value : "";
  if (v === "all") return "all";
  return available.includes(v) ? v : currentSeason();
}
