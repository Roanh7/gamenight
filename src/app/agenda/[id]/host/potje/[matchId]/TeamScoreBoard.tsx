"use client";

import { unlockAudio } from "@/lib/sfx";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Shuffle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatScore } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { ActionBar } from "@/components/ActionBar";
import { ConflictNotice, SyncStatus } from "@/components/SyncStatus";
import { useScoreSync } from "@/lib/useScoreSync";
import { splitKey } from "@/lib/scoreSync";

type Player = { id: string; username: string; avatar_color: string; avatar_url?: string | null; avatar_emoji?: string | null; team: string | null };
type Entry = { team: string; round: number; points: number | null; version?: number };

const TEAM_COLORS = ["bg-red text-white", "bg-blue text-white", "bg-green text-white", "bg-yellow text-night", "bg-purple text-white", "bg-orange text-white"];

export function TeamScoreBoard({
  matchId,
  nightId,
  players,
  teamNames,
  initialEntries,
  lowestWins,
  label = "",
  people = {},
}: {
  matchId: string;
  nightId: string;
  players: Player[];
  teamNames: string[];
  initialEntries: Entry[];
  lowestWins: boolean;
  label?: string;
  people?: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const names = teamNames.length >= 2 ? teamNames : ["Team A", "Team B"];
  const colorOf = (t: string) => TEAM_COLORS[Math.max(0, names.indexOf(t)) % TEAM_COLORS.length];

  /* ---------- Stap 1: teams verdelen ---------- */
  const [assign, setAssign] = useState<Record<string, string>>(() =>
    Object.fromEntries(players.filter((p) => p.team).map((p) => [p.id, p.team as string])),
  );
  const allAssigned = players.every((p) => assign[p.id]);
  const [editingTeams, setEditingTeams] = useState(!allAssigned);
  const [savingTeams, startSaveTeams] = useTransition();
  const usedTeams = names.filter((t) => Object.values(assign).includes(t));

  function shuffle() {
    const order = [...players].sort(() => Math.random() - 0.5);
    const n = Math.min(names.length, Math.max(2, Math.ceil(players.length / 2)));
    setAssign(Object.fromEntries(order.map((p, i) => [p.id, names[i % Math.min(n, names.length)]])));
  }

  function saveTeams() {
    startSaveTeams(async () => {
      setError(null);
      for (const p of players) {
        const { error } = await supabase
          .from("match_players")
          .update({ team: assign[p.id] })
          .eq("match_id", matchId)
          .eq("user_id", p.id);
        if (error) {
          setError("Teams opslaan lukte niet. Probeer het opnieuw.");
          return;
        }
      }
      setEditingTeams(false);
      router.refresh();
    });
  }

  /* ---------- Stap 2: scores per team ---------- */
  const rows = useMemo(
    () => initialEntries.map((e) => ({ key: `${e.team}:${e.round}`, points: e.points == null ? null : Number(e.points), version: e.version ?? 1 })),
    [initialEntries],
  );
  const { engine, value } = useScoreSync(matchId, "team", nightId, label, rows);
  const roundsInUse = Math.max(1, ...engine.keys().map((k) => splitKey(k).round));
  const [extraRounds, setExtraRounds] = useState(0);
  const rounds = roundsInUse + extraRounds;
  const [picked, setRound] = useState<number | null>(null);
  const round = Math.min(picked ?? rounds, rounds);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const text = (key: string) => drafts[key] ?? (value(key) == null ? "" : String(value(key)));

  const totals = usedTeams.map((t) => {
    let total = 0;
    for (let r = 1; r <= rounds; r++) total += value(`${t}:${r}`) ?? 0;
    return { team: t, total };
  });
  const better = (a: number, b: number) => (lowestWins ? a < b : a > b);
  const placeOf = (t: number) => 1 + totals.filter((x) => better(x.total, t)).length;
  const anyScore = totals.some((t) => t.total !== 0);
  const leaders = totals.filter((t) => placeOf(t.total) === 1);

  function setValue(team: string, r: number, raw: string) {
    const key = `${team}:${r}`;
    setDrafts((d) => ({ ...d, [key]: raw }));
    const t = raw.trim().replace(",", ".");
    if (t === "") engine.edit(key, "set", null);
    else if (t !== "-" && Number.isFinite(Number(t))) engine.edit(key, "set", Number(t));
  }

  function bump(team: string, delta: number) {
    const key = `${team}:${round}`;
    setDrafts((d) => {
      const n = { ...d };
      delete n[key];
      return n;
    });
    engine.edit(key, "add", delta);
  }

  async function flushAll() {
    for (let i = 0; i < 3; i++) {
      if (await engine.flush()) return true;
      await new Promise((r) => setTimeout(r, 700));
    }
    return engine.count() === 0;
  }

  function finish() {
    unlockAudio();
    if (!window.confirm("Potje afronden? De punten gaan dan naar de ranglijst.")) return;
    startFinish(async () => {
      setError(null);
      if (!(await flushAll())) {
        setError(
          `Nog ${engine.count()} wijziging(en) staan alleen op dit apparaat. Wacht tot je weer verbinding hebt en probeer het dan opnieuw. Er gaat niks verloren.`,
        );
        return;
      }
      const { error } = await supabase.rpc("finalize_teams_match", { p_match_id: matchId });
      if (error && !/al afgerond/i.test(error.message)) {
        setError(error.message);
        return;
      }
      engine.discard();
      router.replace(`/agenda/${nightId}/host/potje/${matchId}?klaar=1`);
      router.refresh();
    });
  }

  const membersOf = (team: string) => players.filter((p) => assign[p.id] === team);

  /* ---------- Weergave ---------- */
  if (editingTeams) {
    return (
      <div>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-line bg-cream px-4 py-2">
            <p className="text-sm font-black">
              <span className="pixel mr-2 text-[10px] text-red">1</span>Verdeel de teams
            </p>
            <button type="button" onClick={shuffle} className="btn btn-secondary btn-sm">
              <Shuffle size={14} strokeWidth={3} /> Willekeurig
            </button>
          </div>
          <ul className="divide-y-2 divide-soft">
            {players.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" />
                <span className="min-w-0 flex-1 truncate font-black">{p.username}</span>
                <div className="flex flex-wrap gap-1.5">
                  {names.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAssign({ ...assign, [p.id]: t })}
                      aria-pressed={assign[p.id] === t}
                      className={`chip px-3 py-1.5 text-sm ${assign[p.id] === t ? colorOf(t) : "bg-paper"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
        {error && (
          <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={saveTeams}
          disabled={!allAssigned || usedTeams.length < 2 || savingTeams}
          className="btn btn-primary mt-5 w-full"
        >
          {savingTeams ? "Opslaan…" : "▶ Teams vastleggen & spelen"}
        </button>
        {(!allAssigned || usedTeams.length < 2) && (
          <p className="mt-2 text-center text-xs text-muted">Zet iedereen in een team (minimaal 2 teams).</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Live stand per team */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-line bg-night px-4 py-2 text-white">
          <span className="pixel text-[10px]">LIVE STAND</span>
          <span className="text-xs font-bold opacity-80">
            {lowestWins ? "Laagste score wint" : "Hoogste score wint"}
          </span>
        </div>
        <ul className="divide-y-2 divide-soft">
          {[...totals]
            .sort((a, b) => placeOf(a.total) - placeOf(b.total))
            .map((t) => {
              const crown = anyScore && leaders.length === 1 && leaders[0].team === t.team;
              return (
                <li key={t.team} className={`flex items-center gap-3 px-4 py-2.5 ${crown ? "bg-yellow-soft" : ""}`}>
                  <span className="pixel w-5 text-[11px] text-muted">{anyScore ? placeOf(t.total) : "–"}</span>
                  <span className={`chip ${colorOf(t.team)}`}>
                    {crown ? "👑 " : ""}
                    {t.team}
                  </span>
                  <span className="flex min-w-0 flex-1 -space-x-1.5">
                    {membersOf(t.team).map((p) => (
                      <Avatar key={p.id} name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="xs" />
                    ))}
                  </span>
                  <span className="pixel text-base">{formatScore(t.total)}</span>
                </li>
              );
            })}
        </ul>
        {anyScore && leaders.length > 1 && (
          <p className="border-t-2 border-line bg-soft px-4 py-2 text-xs font-bold">
            🤝 Gelijke stand bovenaan: als het zo blijft is er geen winnaar.
          </p>
        )}
      </section>

      {/* Ronde kiezen */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
        {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRound(r)}
            className={`chip shrink-0 px-3 py-1.5 text-sm ${r === round ? "bg-red text-white" : "bg-paper"}`}
          >
            Ronde {r}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setExtraRounds((n) => n + 1);
            setRound(rounds + 1);
          }}
          className="chip shrink-0 bg-blue px-3 py-1.5 text-sm text-white"
        >
          <Plus size={14} strokeWidth={3} /> Ronde
        </button>
      </div>

      {/* Invoer per team */}
      <section className="card mt-3 p-3">
        <p className="mb-2 px-1 text-sm font-black">Punten ronde {round}</p>
        <ul className="space-y-2">
          {usedTeams.map((t) => {
            const key = `${t}:${round}`;
            return (
              <li key={key} className="flex items-center gap-2">
                <span className={`chip min-w-0 flex-1 truncate ${colorOf(t)}`}>{t}</span>
                <button
                  type="button"
                  onClick={() => bump(t, -1)}
                  className="btn btn-secondary h-14 w-14 shrink-0 px-0"
                  aria-label={`1 punt eraf voor ${t}`}
                >
                  <Minus size={22} strokeWidth={3} />
                </button>
                <input
                  inputMode="decimal"
                  className="input h-14 min-h-0 w-16 shrink-0 px-1 text-center text-lg font-black"
                  value={text(key)}
                  placeholder="0"
                  onChange={(e) => setValue(t, round, e.target.value.replace(/[^0-9,.\-]/g, ""))}
                  onBlur={() =>
                    setDrafts((d) => {
                      const n = { ...d };
                      delete n[key];
                      return n;
                    })
                  }
                  aria-label={`Punten ${t} ronde ${round}`}
                />
                <button
                  type="button"
                  onClick={() => bump(t, 1)}
                  className="btn btn-green h-14 w-14 shrink-0 px-0"
                  aria-label={`1 punt erbij voor ${t}`}
                >
                  <Plus size={22} strokeWidth={3} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}

      <ConflictNotice
        engine={engine}
        label={(key) => {
          const { who, round: r } = splitKey(key);
          return `${who} in ronde ${r}`;
        }}
        who={(id) => (id ? (people[id] ?? "De co-host") : "De co-host")}
      />
      {engine.closed && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-yellow-soft px-3 py-2 text-sm font-bold">
          Dit potje is intussen al afgerond.{" "}
          <button type="button" className="underline" onClick={() => router.refresh()}>
            Bekijk de uitslag
          </button>
        </p>
      )}
      <button type="button" onClick={() => setEditingTeams(true)} className="btn btn-secondary btn-sm mt-6 w-full">
        Teams aanpassen
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Elke score wordt meteen op dit apparaat bewaard en daarna naar de server gestuurd. Iedereen in het winnende team krijgt de punten van de 1e plek.
      </p>
      <ActionBar top={<SyncStatus engine={engine} />}>
        <Link href="/live" className="btn btn-secondary shrink-0 px-4">
          ← Avond
        </Link>
        <button type="button" onClick={finish} disabled={finishing} className="btn btn-primary flex-1 py-4 text-lg">
          {finishing ? "Afronden…" : "🏁 Afronden"}
        </button>
      </ActionBar>
    </div>
  );
}
