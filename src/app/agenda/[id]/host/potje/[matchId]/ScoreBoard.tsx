"use client";

import { unlockAudio } from "@/lib/sfx";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatScore } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { ActionBar } from "@/components/ActionBar";
import { ConflictNotice, SyncStatus } from "@/components/SyncStatus";
import { useScoreSync } from "@/lib/useScoreSync";
import { splitKey } from "@/lib/scoreSync";

type Player = { id: string; username: string; avatar_color: string; avatar_url?: string | null; avatar_emoji?: string | null };
type Entry = { user_id: string; round: number; points: number | null; version?: number };

export function ScoreBoard({
  matchId,
  nightId,
  players,
  initialEntries,
  lowestWins,
  isTeam = false,
  gameId,
  label = "",
  people = {},
}: {
  matchId: string;
  nightId: string;
  players: Player[];
  initialEntries: Entry[];
  lowestWins: boolean;
  isTeam?: boolean;
  /** Voor het onthouden van de snelle modus per game */
  gameId?: string;
  /** Naam van het potje (voor de melding als er nog iets niet is opgeslagen) */
  label?: string;
  /** Namen van iedereen (voor de melding wie het laatst wijzigde) */
  people?: Record<string, string>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const rows = useMemo(
    () => initialEntries.map((e) => ({ key: `${e.user_id}:${e.round}`, points: e.points == null ? null : Number(e.points), version: e.version ?? 1 })),
    [initialEntries],
  );
  const { engine, value } = useScoreSync(matchId, "player", nightId, label, rows);
  const roundsInUse = Math.max(1, ...engine.keys().map((k) => splitKey(k).round));
  const [extraRounds, setExtraRounds] = useState(0);
  const rounds = roundsInUse + extraRounds;
  const [picked, setRound] = useState<number | null>(null); // actieve ronde (standaard de laatste)
  const round = Math.min(picked ?? rounds, rounds);
  // Wat je aan het typen bent (bijv. "-" of "3,"), los van de opgeslagen waarde
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  // Snelle modus: alleen de winnaar aantikken
  const [quick, setQuick] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const quickKey = gameId ? `gn-snel-${gameId}` : null;
  useEffect(() => {
    if (!quickKey || initialEntries.length) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- voorkeur uit localStorage na het laden
      if (localStorage.getItem(quickKey) === "1") setQuick(true);
    } catch {}
  }, [quickKey, initialEntries.length]);
  function chooseMode(q: boolean) {
    setQuick(q);
    try {
      if (quickKey) localStorage.setItem(quickKey, q ? "1" : "0");
    } catch {}
  }
  const text = (key: string) => drafts[key] ?? (value(key) == null ? "" : String(value(key)));

  const totals = players.map((p) => {
    let t = 0;
    for (let r = 1; r <= rounds; r++) t += value(`${p.id}:${r}`) ?? 0;
    return { id: p.id, total: t };
  });
  const sortedTotals = [...totals].sort((a, b) => (lowestWins ? a.total - b.total : b.total - a.total));
  const placeOf = (id: string) => {
    const t = totals.find((x) => x.id === id)!.total;
    return 1 + sortedTotals.filter((x) => (lowestWins ? x.total < t : x.total > t)).length;
  };
  const leaders = totals.filter((t) => placeOf(t.id) === 1);
  const anyScore = totals.some((t) => t.total !== 0);

  function setValue(userId: string, r: number, raw: string) {
    const key = `${userId}:${r}`;
    setDrafts((d) => ({ ...d, [key]: raw }));
    const t = raw.trim().replace(",", ".");
    if (t === "") engine.edit(key, "set", null);
    else if (t !== "-" && Number.isFinite(Number(t))) engine.edit(key, "set", Number(t));
  }

  function bump(userId: string, delta: number) {
    const key = `${userId}:${round}`;
    setDrafts((d) => {
      const n = { ...d };
      delete n[key];
      return n;
    });
    engine.edit(key, "add", delta);
  }

  /** Alles naar de server; false als dat (nu) niet lukt. */
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
      const { error } = await supabase.rpc("finalize_match", { p_match_id: matchId });
      if (error && !/al afgerond/i.test(error.message)) {
        setError(error.message);
        return;
      }
      engine.discard();
      router.replace(`/agenda/${nightId}/host/potje/${matchId}?klaar=1`);
      router.refresh();
    });
  }

  function finishQuick() {
    unlockAudio();
    const w = players.find((p) => p.id === winner);
    if (!w) return;
    if (!window.confirm(`${w.username} wint dit potje? De punten gaan dan naar de ranglijst.`)) return;
    startFinish(async () => {
      setError(null);
      engine.discard(); // punten tellen telt niet mee: alleen de winnaar
      const del = await supabase.from("score_entries").delete().eq("match_id", matchId);
      const ins = del.error
        ? del
        : await supabase.from("score_entries").insert(
            players.map((p) => ({
              match_id: matchId,
              user_id: p.id,
              round: 1,
              points: (p.id === w.id) !== lowestWins ? 1 : 0,
            })),
          );
      if (ins.error) {
        setError("Opslaan mislukt. Check je verbinding.");
        return;
      }
      const { error } = await supabase.rpc("finalize_match", { p_match_id: matchId });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(`/agenda/${nightId}/host/potje/${matchId}?klaar=1`);
      router.refresh();
    });
  }

  function addRound() {
    setExtraRounds((n) => n + 1);
    setRound(rounds + 1);
  }

  const modeSwitch = !isTeam && (
    <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border-2 border-line bg-paper p-1" role="tablist" aria-label="Manier van scoren">
      {(
        [
          [true, "⚡ Alleen winnaar"],
          [false, "🔢 Punten tellen"],
        ] as const
      ).map(([q, label]) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-selected={quick === q}
          onClick={() => chooseMode(q)}
          className={`rounded-xl px-2 py-2.5 text-sm font-black ${quick === q ? "bg-night text-white" : "text-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (quick && !isTeam) {
    return (
      <div>
        {modeSwitch}
        <section className="card p-3">
          <p className="mb-3 px-1 text-sm font-black">Wie heeft er gewonnen? Tik de winnaar aan.</p>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => {
              const on = winner === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setWinner(on ? null : p.id)}
                  aria-pressed={on}
                  className={`flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-line p-3 transition-transform active:translate-y-[2px] ${
                    on ? "bg-yellow shadow-[0_4px_0_var(--color-line)]" : "bg-paper"
                  }`}
                >
                  <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="lg" crown={on} />
                  <span className="w-full truncate text-center font-black">{p.username}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 px-1 text-xs font-bold text-muted">
            De winnaar krijgt de punten van de 1e plek, de rest deelt de 2e plek. Wil je precies tellen? Kies dan Punten tellen.
          </p>
        </section>
        {error && (
          <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
            {error}
          </p>
        )}
        <ActionBar>
          <Link href="/live" className="btn btn-secondary shrink-0 px-4">
            ← Avond
          </Link>
          <button type="button" onClick={finishQuick} disabled={!winner || finishing} className="btn btn-primary flex-1 py-4 text-lg">
            {finishing ? "Afronden…" : winner ? "🏁 Afronden" : "Kies de winnaar"}
          </button>
        </ActionBar>
      </div>
    );
  }

  return (
    <div>
      {modeSwitch}
      {/* Live stand */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-line bg-night px-4 py-2 text-white">
          <span className="pixel text-[10px]">LIVE STAND</span>
          <span className="text-xs font-bold opacity-80">{lowestWins ? "Laagste score wint" : "Hoogste score wint"}</span>
        </div>
        <ul className="divide-y-2 divide-soft">
          {[...players]
            .sort((a, b) => placeOf(a.id) - placeOf(b.id))
            .map((p) => {
              const t = totals.find((x) => x.id === p.id)!.total;
              const place = placeOf(p.id);
              const crown =
                anyScore && place === 1 && (leaders.length === 1 || (isTeam && leaders.length < players.length));
              return (
                <li key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${crown ? "bg-yellow-soft" : ""}`}>
                  <span className="pixel w-5 text-[11px] text-muted">{anyScore ? place : "–"}</span>
                  <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" crown={crown} />
                  <span className="min-w-0 flex-1 truncate font-black">{p.username}</span>
                  <span className="pixel text-base">{formatScore(t)}</span>
                </li>
              );
            })}
        </ul>
        {anyScore && leaders.length > 1 && (
          <p className="border-t-2 border-line bg-soft px-4 py-2 text-xs font-bold">
            {isTeam && leaders.length < players.length
              ? `👥 Teamspel: ${leaders.length} spelers bovenaan winnen samen.`
              : "🤝 Gelijke stand bovenaan: als het zo blijft is er geen winnaar."}
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
        <button type="button" onClick={addRound} className="chip shrink-0 bg-blue px-3 py-1.5 text-sm text-white">
          <Plus size={14} strokeWidth={3} /> Ronde
        </button>
      </div>

      {/* Invoer actieve ronde */}
      <section className="card mt-3 p-3">
        <p className="mb-2 px-1 text-sm font-black">Punten ronde {round}</p>
        <ul className="space-y-3">
          {players.map((p) => {
            const key = `${p.id}:${round}`;
            return (
              <li key={key} className="flex items-center gap-2">
                <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" />
                <span className="min-w-0 flex-1 truncate font-black">{p.username}</span>
                <button
                  type="button"
                  onClick={() => bump(p.id, -1)}
                  className="btn btn-secondary h-14 w-14 shrink-0 px-0"
                  aria-label={`1 punt eraf voor ${p.username}`}
                >
                  <Minus size={22} strokeWidth={3} />
                </button>
                <input
                  inputMode="decimal"
                  className="input h-14 min-h-0 w-16 shrink-0 px-1 text-center text-lg font-black"
                  value={text(key)}
                  placeholder="0"
                  onChange={(e) => setValue(p.id, round, e.target.value.replace(/[^0-9,.\-]/g, ""))}
                  onBlur={() =>
                    setDrafts((d) => {
                      const n = { ...d };
                      delete n[key];
                      return n;
                    })
                  }
                  aria-label={`Punten ${p.username} ronde ${round}`}
                />
                <button
                  type="button"
                  onClick={() => bump(p.id, 1)}
                  className="btn btn-green h-14 w-14 shrink-0 px-0"
                  aria-label={`1 punt erbij voor ${p.username}`}
                >
                  <Plus size={22} strokeWidth={3} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Overzicht alle rondes */}
      {rounds > 1 && (
        <section className="card mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-line bg-cream">
                <th className="sticky left-0 bg-cream px-3 py-2 text-left font-black">Speler</th>
                {Array.from({ length: rounds }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center font-black">
                    R{i + 1}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-black">Tot.</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b-2 border-soft last:border-0">
                  <td className="sticky left-0 bg-paper px-3 py-2 font-bold">{p.username}</td>
                  {Array.from({ length: rounds }, (_, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      {text(`${p.id}:${i + 1}`) || "–"}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-black">
                    {formatScore(totals.find((x) => x.id === p.id)!.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}

      <ConflictNotice
        engine={engine}
        label={(key) => {
          const { who, round: r } = splitKey(key);
          return `${players.find((x) => x.id === who)?.username ?? "?"} in ronde ${r}`;
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

      <p className="mt-6 text-center text-xs text-muted">
        Elke score wordt meteen op dit apparaat bewaard en daarna naar de server gestuurd.{" "}
        {isTeam ? "Teamspel: iedereen bovenaan wint samen." : "Bij gelijke stand bovenaan is er geen winnaar."}
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
