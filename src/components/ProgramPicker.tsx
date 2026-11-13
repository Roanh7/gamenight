"use client";

import { useState } from "react";
import { ListChecks, Vote } from "lucide-react";
import type { Game } from "@/lib/types";
import { GameIcon } from "./GameIcon";
import { isSmashGame } from "@/lib/smashCup";

/** Kies: iedereen stemt (meerdere games), of zelf vaste games voor de avond kiezen. */
export function ProgramPicker({
  games,
  defaultMode = "vote",
  defaultGames = [],
  defaultCup = false,
}: {
  games: Pick<Game, "id" | "name" | "icon" | "color">[];
  defaultMode?: "vote" | "fixed";
  defaultGames?: string[];
  /** 🏆 Was deze avond al als Smash Bros Championship Cup gepland? */
  defaultCup?: boolean;
}) {
  const [mode, setMode] = useState<"vote" | "fixed">(defaultMode);
  const [picked, setPicked] = useState<string[]>(defaultGames);
  const [cup, setCup] = useState(defaultCup);
  const smashIds = games.filter((g) => isSmashGame(g.name)).map((g) => g.id);
  // De keuze verschijnt alleen als Smash Bros op het programma kan staan
  const smashOn = smashIds.length > 0 && (mode === "vote" || picked.some((id) => smashIds.includes(id)));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <div>
      <span className="label">Welke games spelen we?</span>
      <input type="hidden" name="vote_mode" value={mode} />
      <input type="hidden" name="smash_type" value={smashOn && cup ? "cup" : "normal"} />
      {mode === "fixed" && picked.map((id) => <input key={id} type="hidden" name="game_ids" value={id} />)}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["vote", "Iedereen stemt", "Op meerdere games; de populairste spelen we", Vote],
            ["fixed", "Ik kies de games", "Vaste selectie, geen stemming", ListChecks],
          ] as const
        ).map(([val, label, hint, Icon]) => (
          <button
            key={val}
            type="button"
            onClick={() => setMode(val)}
            aria-pressed={mode === val}
            className={`rounded-xl border-2 border-line p-3 text-left ${mode === val ? "bg-purple text-white shadow-[0_3px_0_var(--color-line)]" : "bg-paper"}`}
          >
            <Icon size={20} strokeWidth={2.5} />
            <p className="mt-1 text-sm font-black leading-tight">{label}</p>
            <p className={`text-xs leading-tight ${mode === val ? "opacity-80" : "text-muted"}`}>{hint}</p>
          </button>
        ))}
      </div>

      {mode === "fixed" && (
        <div className="mt-3">
          {games.length === 0 ? (
            <p className="text-sm font-bold text-muted">Er zijn nog geen games. Voeg ze eerst toe onder Games.</p>
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-2 [&>li]:min-w-0">
                {games.map((g) => {
                  const pos = picked.indexOf(g.id);
                  const on = pos >= 0;
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => toggle(g.id)}
                        aria-pressed={on}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 border-line px-3 py-2 text-left ${on ? "bg-green-soft" : "bg-paper"}`}
                      >
                        <GameIcon icon={g.icon} color={g.color} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-black">{g.name}</span>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 border-line text-sm font-black ${on ? "bg-green text-white" : "bg-paper"}`}
                        >
                          {on ? "✓" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Tik de games aan die jullie willen spelen. Welke wanneer, kies je op de avond zelf. {picked.length} gekozen.
              </p>
            </>
          )}
        </div>
      )}
      {smashOn && (
        <fieldset className="mt-4 rounded-xl border-2 border-line bg-cream p-3">
          <legend className="px-1 text-sm font-black">Welk type Smash Bros spelen we?</legend>
          <div className="grid gap-2">
            {(
              [
                [false, "🎮", "Normaal Smash Bros-potje", "Telt gewoon mee zoals altijd"],
                [true, "🏆", "Smash Bros Championship Cup", "Officieel bekerevenement: de winnaar krijgt de wisselbeker"],
              ] as const
            ).map(([val, icon, label, hint]) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setCup(val)}
                aria-pressed={cup === val}
                className={`flex items-center gap-3 rounded-xl border-2 border-line p-2.5 text-left ${
                  cup === val ? (val ? "cup-choice-on" : "bg-purple text-white shadow-[0_3px_0_var(--color-line)]") : "bg-paper"
                }`}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black leading-tight">{label}</span>
                  <span className={`block text-xs leading-tight ${cup === val ? "opacity-80" : "text-muted"}`}>{hint}</span>
                </span>
              </button>
            ))}
          </div>
          {cup && mode === "vote" && (
            <p className="mt-2 text-xs font-bold text-muted">Let op: zorg dat Smash Bros die avond ook echt gespeeld wordt, anders kan de beker niet worden uitgereikt.</p>
          )}
        </fieldset>
      )}
    </div>
  );
}
