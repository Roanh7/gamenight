import Link from "next/link";
import type { Game, Profile } from "@/lib/types";
import { SPECIALIST_MIN_PLAYED, formatRate, specialistTitle, type SpecialistRow } from "@/lib/specialists";
import { seasonLabel } from "@/lib/stats";
import { Avatar } from "./Avatar";
import { GameIcon } from "./GameIcon";
import { RankBadge } from "./ui";

type Board = { ranked: SpecialistRow[]; unranked: SpecialistRow[] };

/** Kleine titel-badge: 🏆 SMASH MASTER */
export function SpecialistBadge({ title, className = "" }: { title: string; className?: string }) {
  return <span className={`spec-badge pixel ${className}`}>🏆 {title}</span>;
}

/** Laatste potjes als pixelblokjes (nieuwste links): goud = gewonnen. */
export function FormDots({ form }: { form: boolean[] }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`Laatste ${form.length}: ${form.filter(Boolean).length} gewonnen`}>
      {form.map((w, i) => (
        <span key={i} className={`spec-dot ${w ? "win" : ""}`} />
      ))}
    </span>
  );
}

/** 🎮 GAME SPECIALISTS — één pixelkaart per game, binnen de Ranking-pagina. */
export function SpecialistCards({
  games,
  boards,
  allTime,
  profiles,
  season,
}: {
  games: Game[];
  boards: Map<string, Board>; // voor het gekozen seizoen (of all-time)
  allTime: Map<string, Board>;
  profiles: Map<string, Profile>;
  season: string; // "all" of "2026-Q4"
}) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 [&>li]:min-w-0">
      {games.map((g) => {
        const board = boards.get(g.id);
        const top = (board?.ranked ?? []).filter((s) => s.rank === 1);
        const holders = (allTime.get(g.id)?.ranked ?? []).filter((s) => s.rank === 1).map((s) => s.user_id);
        const lead = top[0];
        const names = top.map((s) => profiles.get(s.user_id)?.username ?? "?").join(" & ");
        const href = `/games/${g.id}${season === "all" ? "?seizoen=all" : season ? `?seizoen=${season}` : ""}#specialisten`;
        return (
          <li key={g.id}>
            <Link href={href} className={`spec-card ${lead ? "has-master" : ""}`}>
              <span className="flex min-w-0 items-center gap-2">
                <GameIcon icon={g.icon} color={g.color} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-black">{g.name}</span>
              </span>
              <span className="spec-gold pixel mt-2 block truncate text-[7px]">
                {season === "all" ? `👑 ${specialistTitle(g)}` : `📅 BESTE IN ${seasonLabel(season).toUpperCase()}`}
              </span>
              {lead ? (
                <>
                  <span className="mt-3 flex min-w-0 items-center gap-1.5">
                    <span className="flex shrink-0 -space-x-2">
                      {top.slice(0, 3).map((s) => {
                        const p = profiles.get(s.user_id);
                        return p ? <Avatar key={s.user_id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" crown /> : null;
                      })}
                    </span>
                    <span className="min-w-0 truncate text-sm font-black">{names}</span>
                  </span>
                  <span className="mt-1.5 block text-[11px] font-bold text-muted">
                    🏆 {lead.wins} {lead.wins === 1 ? "zege" : "zeges"} · 📊 {formatRate(lead.winrate)}%
                  </span>
                  {season !== "all" && holders.length > 0 && (
                    <span className="mt-0.5 block truncate text-[10px] font-bold text-muted">
                      👑 {holders.map((u) => profiles.get(u)?.username ?? "?").join(" & ")}
                    </span>
                  )}
                </>
              ) : (
                <span className="mt-1.5 block text-xs font-bold text-muted">
                  🔒 Nog niemand officieel
                  <span className="block text-[10px]">min. {SPECIALIST_MIN_PLAYED} potjes</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Volledige specialist-ranglijst van één game (gerankt + nog niet gerankt). */
export function SpecialistTable({
  board,
  holders,
  title,
  profiles,
  meId,
}: {
  board: Board | undefined;
  holders: string[]; // houders van de all-time titel
  title: string;
  profiles: Map<string, Profile>;
  meId?: string;
}) {
  const ranked = board?.ranked ?? [];
  const unranked = board?.unranked ?? [];
  if (!ranked.length && !unranked.length) {
    return <p className="card px-4 py-3 text-sm font-bold text-muted">Nog geen potjes. Na {SPECIALIST_MIN_PLAYED} potjes krijg je een officiële ranking.</p>;
  }
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b-2 border-line bg-cream px-3 py-1.5 text-[10px] font-black uppercase text-muted">
        <span className="w-8">#</span>
        <span className="flex-1">Speler</span>
        <span className="w-9 text-right">Gesp.</span>
        <span className="w-9 text-right">Won</span>
        <span className="w-14 text-right">Win%</span>
      </div>
      {ranked.length > 0 ? (
        <ol className="divide-y-2 divide-soft">
          {ranked.map((s) => {
            const p = profiles.get(s.user_id);
            const isHolder = holders.includes(s.user_id);
            return (
              <li key={s.user_id} className={`flex items-center gap-2 px-3 py-2 ${s.rank === 1 ? "spec-top" : ""} ${s.user_id === meId ? "bg-yellow-soft" : ""}`}>
                <RankBadge rank={s.rank!} />
                <Avatar name={p?.username ?? "?"} color={p?.avatar_color} url={p?.avatar_url} emoji={p?.avatar_emoji} size="sm" crown={s.rank === 1} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{p?.username ?? "Oud-speler"}</span>
                  {isHolder ? <SpecialistBadge title={title.split(" ").pop() ?? title} className="mt-0.5" /> : <FormDots form={s.form} />}
                </span>
                <span className="w-9 text-right text-sm font-bold">{s.played}</span>
                <span className="w-9 text-right text-sm font-bold">{s.wins}</span>
                <span className="pixel w-14 text-right text-[9px]">{formatRate(s.winrate)}%</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="px-3 py-3 text-sm font-bold text-muted">Nog niemand heeft {SPECIALIST_MIN_PLAYED} potjes gespeeld.</p>
      )}
      {unranked.length > 0 && (
        <div className="border-t-2 border-line bg-cream/60">
          <p className="pixel px-3 pt-2 text-[8px] text-muted">🔒 NOT YET RANKED</p>
          <ul className="divide-y-2 divide-soft">
            {unranked.map((s) => {
              const p = profiles.get(s.user_id);
              const left = SPECIALIST_MIN_PLAYED - s.played;
              return (
                <li key={s.user_id} className={`flex items-center gap-2 px-3 py-1.5 ${s.user_id === meId ? "bg-yellow-soft" : ""}`}>
                  <span className="w-8 text-center text-sm" aria-hidden>
                    🔒
                  </span>
                  <Avatar name={p?.username ?? "?"} color={p?.avatar_color} url={p?.avatar_url} emoji={p?.avatar_emoji} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{p?.username ?? "Oud-speler"}</span>
                    <span className="block text-[11px] font-bold text-muted">
                      {s.played}/{SPECIALIST_MIN_PLAYED} potjes · nog {left} {left === 1 ? "potje" : "potjes"} voor een ranking
                    </span>
                  </span>
                  <span className="w-9 text-right text-sm font-bold">{s.wins}</span>
                  <span className="pixel w-14 text-right text-[9px] text-muted">{formatRate(s.winrate)}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
