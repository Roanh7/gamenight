"use client";

import { unlockAudio } from "@/lib/sfx";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatScore } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

type Player = { id: string; username: string; avatar_color: string; avatar_url?: string | null; avatar_emoji?: string | null };
type Entry = { user_id: string; round: number; points: number };

export function ScoreBoard({
  matchId,
  nightId,
  players,
  initialEntries,
  lowestWins,
  isTeam = false,
}: {
  matchId: string;
  nightId: string;
  players: Player[];
  initialEntries: Entry[];
  lowestWins: boolean;
  isTeam?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const initialRounds = Math.max(1, ...initialEntries.map((e) => e.round));
  const [rounds, setRounds] = useState(initialRounds);
  const [round, setRound] = useState(initialRounds); // actieve ronde
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const e of initialEntries) v[`${e.user_id}:${e.round}`] = String(e.points);
    return v;
  });
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const pendingSaves = useRef(new Set<Promise<unknown>>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const num = (s: string | undefined) => {
    if (s === undefined || s.trim() === "" || s === "-") return 0;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const totals = players.map((p) => {
    let t = 0;
    for (let r = 1; r <= rounds; r++) t += num(values[`${p.id}:${r}`]);
    return { id: p.id, total: t };
  });
  const sortedTotals = [...totals].sort((a, b) => (lowestWins ? a.total - b.total : b.total - a.total));
  const placeOf = (id: string) => {
    const t = totals.find((x) => x.id === id)!.total;
    return 1 + sortedTotals.filter((x) => (lowestWins ? x.total < t : x.total > t)).length;
  };
  const leaders = totals.filter((t) => placeOf(t.id) === 1);
  const anyScore = totals.some((t) => t.total !== 0);

  function save(userId: string, r: number, raw: string) {
    const key = `${userId}:${r}`;
    const prev = timers.current.get(key);
    if (prev) clearTimeout(prev);
    timers.current.set(
      key,
      setTimeout(() => {
        timers.current.delete(key);
        setSaving("saving");
        const isEmpty = raw.trim() === "" || raw === "-";
        const p: Promise<void> = Promise.resolve(
          isEmpty
            ? supabase.from("score_entries").delete().eq("match_id", matchId).eq("user_id", userId).eq("round", r)
            : supabase
                .from("score_entries")
                .upsert(
                  { match_id: matchId, user_id: userId, round: r, points: num(raw) },
                  { onConflict: "match_id,user_id,round" },
                )
        ).then(({ error }) => {
          pendingSaves.current.delete(p);
          if (error) {
            setSaving("error");
            setError("Opslaan mislukt. Check je verbinding.");
          } else if (pendingSaves.current.size === 0) {
            setSaving("saved");
          }
        });
        pendingSaves.current.add(p);
      }, 350),
    );
  }

  function setValue(userId: string, r: number, raw: string) {
    setValues((v) => ({ ...v, [`${userId}:${r}`]: raw }));
    save(userId, r, raw);
  }

  function bump(userId: string, delta: number) {
    const cur = num(values[`${userId}:${round}`]);
    setValue(userId, round, String(cur + delta));
  }

  async function flush() {
    // Wacht tot alle debounces zijn verstuurd en opgeslagen
    while (timers.current.size > 0) await new Promise((r) => setTimeout(r, 120));
    await Promise.all([...pendingSaves.current]);
  }

  function finish() {
    unlockAudio();
    if (!window.confirm("Potje afronden? De punten gaan dan naar de ranglijst.")) return;
    startFinish(async () => {
      setError(null);
      await flush();
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
    setRounds((n) => n + 1);
    setRound(rounds + 1);
  }

  return (
    <div>
      {/* Live stand */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b-2 border-line bg-ink px-4 py-2 text-white">
          <span className="pixel text-[10px]">LIVE STAND</span>
          <span className="text-xs font-bold opacity-80">
            {saving === "saving" && "Opslaan…"}
            {saving === "saved" && "✓ Opgeslagen"}
            {saving === "error" && "⚠ Niet opgeslagen"}
            {saving === "idle" && (lowestWins ? "Laagste score wint" : "Hoogste score wint")}
          </span>
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
        <ul className="space-y-2">
          {players.map((p) => {
            const key = `${p.id}:${round}`;
            return (
              <li key={key} className="flex items-center gap-2">
                <Avatar name={p.username} color={p.avatar_color} url={p.avatar_url} emoji={p.avatar_emoji} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{p.username}</span>
                <button
                  type="button"
                  onClick={() => bump(p.id, -1)}
                  className="btn btn-secondary btn-sm h-10 w-10 px-0"
                  aria-label={`1 punt eraf voor ${p.username}`}
                >
                  <Minus size={16} strokeWidth={3} />
                </button>
                <input
                  inputMode="decimal"
                  className="input h-10 min-h-0 w-20 px-2 text-center font-black"
                  value={values[key] ?? ""}
                  placeholder="0"
                  onChange={(e) => setValue(p.id, round, e.target.value.replace(/[^0-9,.\-]/g, ""))}
                  aria-label={`Punten ${p.username} ronde ${round}`}
                />
                <button
                  type="button"
                  onClick={() => bump(p.id, 1)}
                  className="btn btn-green btn-sm h-10 w-10 px-0"
                  aria-label={`1 punt erbij voor ${p.username}`}
                >
                  <Plus size={16} strokeWidth={3} />
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
                      {values[`${p.id}:${i + 1}`] || "–"}
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

      <button type="button" onClick={finish} disabled={finishing} className="btn btn-primary mt-6 w-full">
        {finishing ? "Afronden…" : "🏁 Potje afronden"}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        Scores worden automatisch opgeslagen.{" "}
        {isTeam ? "Teamspel: iedereen bovenaan wint samen." : "Bij gelijke stand bovenaan is er geen winnaar."}
      </p>
    </div>
  );
}
