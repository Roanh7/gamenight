"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { GameTeam } from "@/lib/types";
import { Avatar } from "@/components/Avatar";

type Player = { id: string; username: string; avatar_color: string; team: string | null };

const TEAM_COLORS = ["bg-blue text-white", "bg-red text-white", "bg-purple text-white", "bg-green text-white", "bg-orange text-white", "bg-teal text-white"];

/** Na afloop: per speler de rol aantikken, dan het winnende team kiezen. */
export function TeamResult({
  matchId,
  nightId,
  players,
  teams,
  participationPoints,
}: {
  matchId: string;
  nightId: string;
  players: Player[];
  teams: GameTeam[];
  participationPoints: number;
}) {
  const router = useRouter();
  const teamList = teams.length ? teams : [{ name: "Team A", points: 10 }, { name: "Team B", points: 10 }];
  const [assign, setAssign] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.filter((p) => p.team).map((p) => [p.id, p.team as string])),
  );
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const colorOf = (name: string) => TEAM_COLORS[Math.max(0, teamList.findIndex((t) => t.name === name)) % TEAM_COLORS.length];
  const allAssigned = players.every((p) => assign[p.id]);
  const usedTeams = teamList.filter((t) => Object.values(assign).includes(t.name));
  const winners = players.filter((p) => winner && assign[p.id] === winner);
  const winPoints = teamList.find((t) => t.name === winner)?.points ?? 0;

  function finish() {
    if (!winner) return;
    if (!window.confirm(`${winner} wint? De punten gaan dan naar de ranglijst.`)) return;
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.rpc("finalize_team_match", {
        p_match_id: matchId,
        p_winning_team: winner,
        p_teams: assign,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(`/agenda/${nightId}/host/potje/${matchId}?klaar=1`);
      router.refresh();
    });
  }

  return (
    <div>
      <section className="card bg-purple-soft p-4">
        <p className="pixel text-[9px] text-purple">TEAMSPEL</p>
        <p className="mt-1 font-black">Speel eerst het spel uit 🤫</p>
        <p className="text-sm">
          De rollen zijn geheim, dus hier vul je pas iets in als het spel voorbij is en iedereen zijn rol laat zien.
        </p>
      </section>

      {/* Stap 1: rollen */}
      <section className="card mt-4 overflow-hidden">
        <p className="border-b-2 border-line bg-cream px-4 py-2 text-sm font-black">
          <span className="pixel mr-2 text-[10px] text-red">1</span>Wie had welke rol?
        </p>
        <ul className="divide-y-2 divide-soft">
          {players.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <Avatar name={p.username} color={p.avatar_color} size="sm" />
                <span className="font-black">{p.username}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {teamList.map((t) => {
                  const active = assign[p.id] === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => {
                        setAssign({ ...assign, [p.id]: t.name });
                        setWinner(null);
                      }}
                      aria-pressed={active}
                      className={`chip px-3 py-1.5 text-sm ${active ? colorOf(t.name) : "bg-paper"}`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Stap 2: winnaar */}
      <section className={`card mt-4 overflow-hidden ${allAssigned ? "" : "opacity-50"}`}>
        <p className="border-b-2 border-line bg-cream px-4 py-2 text-sm font-black">
          <span className="pixel mr-2 text-[10px] text-red">2</span>Welk team heeft gewonnen?
        </p>
        <div className="grid gap-2 p-4">
          {(allAssigned ? usedTeams : teamList).map((t) => (
            <button
              key={t.name}
              type="button"
              disabled={!allAssigned}
              onClick={() => setWinner(t.name)}
              aria-pressed={winner === t.name}
              className={`btn justify-between ${winner === t.name ? "btn-yellow" : "btn-secondary"}`}
            >
              <span>🏆 {t.name}</span>
              <span className="text-sm">+{t.points} pt</span>
            </button>
          ))}
          {!allAssigned && <p className="text-xs font-bold text-muted">Kies eerst voor iedereen een rol.</p>}
        </div>
        {winner && (
          <p className="border-t-2 border-soft px-4 py-2 text-sm">
            <b>{winners.map((w) => w.username).join(" & ")}</b> krijgen {winPoints + participationPoints} punten
            {participationPoints > 0 && <>, de rest krijgt {participationPoints} voor het meedoen</>}.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}

      <button type="button" onClick={finish} disabled={!winner || pending} className="btn btn-primary mt-6 w-full">
        {pending ? "Afronden…" : "🏁 Potje afronden"}
      </button>
    </div>
  );
}
