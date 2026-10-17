import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getMe } from "@/lib/supabase/server";
import { loadCards } from "@/lib/cards";
import { PlayerCard } from "@/components/PlayerCard";
import { PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Vergelijk kaarten" };

export default async function ComparePage(props: PageProps<"/kaarten/vergelijk">) {
  const sp = await props.searchParams;
  const me = await getMe();
  if (!me) redirect("/login");
  const supabase = await createClient();
  const data = await loadCards(supabase);
  const find = (v: unknown) =>
    typeof v === "string" ? data.profiles.list.find((p) => p.username.toLowerCase() === v.toLowerCase()) : undefined;
  const a = find(sp.a) ?? data.profiles.byId.get(me.user.id);
  const b = find(sp.b) ?? data.profiles.list.find((p) => p.id !== a?.id);
  if (!a || !b || a.id === b.id) redirect("/kaarten?tab=album");

  const ca = data.collectionFor(a.id);
  const cb = data.collectionFor(b.id);
  const h = data.versus(a.id, b.id);
  const rows: [string, number | string, number | string, "high" | "none"][] = [
    ["OVR", ca.col.current.ovr ?? "–", cb.col.current.ovr ?? "–", "high"],
    ["Level", ca.xp.level, cb.xp.level, "high"],
    ["Winpercentage", `${ca.col.current.winPct}%`, `${cb.col.current.winPct}%`, "high"],
    ["Potjes", ca.col.current.games, cb.col.current.games, "high"],
    ["Langste winstreeks", ca.col.current.streak, cb.col.current.streak, "high"],
    ["Trofeeën", ca.col.current.trophies, cb.col.current.trophies, "high"],
    ["Edities", Object.values(ca.col.earned).filter(Boolean).length, Object.values(cb.col.earned).filter(Boolean).length, "high"],
  ];
  const num = (v: number | string) => (typeof v === "number" ? v : parseFloat(String(v)) || 0);

  return (
    <div>
      <PageHeader back="/kaarten?tab=album" kicker="VERGELIJK" title={`${a.username} vs ${b.username}`} />
      <div className="grid grid-cols-2 justify-items-center gap-2">
        {[
          [a, ca],
          [b, cb],
        ].map(([p, c]) => {
          const pp = p as typeof a;
          const cc = c as typeof ca;
          return (
            <Link key={pp.id} href={pp.id === me.user.id ? "/kaarten" : `/kaarten/${pp.username}`}>
              <PlayerCard
                name={pp.username}
                color={pp.avatar_color}
                emoji={pp.avatar_emoji}
                nickname={cc.nickname}
                edition={cc.shown.edition}
                stats={cc.shown.stats}
                season={cc.shown.season}
                size="sm"
              />
            </Link>
          );
        })}
      </div>

      <SectionTitle>Statistieken</SectionTitle>
      <ul className="card divide-y-2 divide-soft overflow-hidden">
        {rows.map(([label, va, vb]) => {
          const na = num(va);
          const nb = num(vb);
          return (
            <li key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 text-center">
              <span className={`pixel text-xs ${na > nb ? "text-green" : ""}`}>{va}</span>
              <span className="text-[11px] font-black uppercase text-muted">{label}</span>
              <span className={`pixel text-xs ${nb > na ? "text-green" : ""}`}>{vb}</span>
            </li>
          );
        })}
        <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 bg-cream px-3 py-2.5 text-center">
          <span className={`pixel text-xs ${h.wins > h.losses ? "text-green" : ""}`}>{h.wins}</span>
          <span className="text-[11px] font-black uppercase text-muted">Onderling{h.draws ? ` (${h.draws}× gelijk)` : ""}</span>
          <span className={`pixel text-xs ${h.losses > h.wins ? "text-green" : ""}`}>{h.losses}</span>
        </li>
      </ul>
    </div>
  );
}
