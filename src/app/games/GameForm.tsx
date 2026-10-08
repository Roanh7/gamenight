"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";
import type { Color, Game } from "@/lib/types";
import { GAME_ICONS, GameIcon } from "@/components/GameIcon";
import { ColorPicker } from "@/components/ColorPicker";
import { SubmitButton } from "@/components/SubmitButton";

const PLACES = ["1e", "2e", "3e", "4e", "5e", "6e"];

export function GameForm({
  action,
  game,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<void>;
  game?: Game;
  submitLabel: string;
}) {
  const [icon, setIcon] = useState(game?.icon ?? "gamepad");
  const [mode, setMode] = useState<Game["scoring_mode"]>(game?.scoring_mode ?? "highest_wins");
  const points = game?.placement_points ?? [10, 6, 4, 2, 1];

  return (
    <form action={action} className="space-y-5">
      {game && <input type="hidden" name="game_id" value={game.id} />}

      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <GameIcon icon={icon} color="yellow" size="lg" />
          <div className="flex-1">
            <label className="label" htmlFor="name">
              Naam van de game
            </label>
            <input id="name" name="name" className="input" required maxLength={60} defaultValue={game?.name} placeholder="bijv. Mario Kart 8" />
          </div>
        </div>
        <div>
          <span className="label">Icoon</span>
          <input type="hidden" name="icon" value={icon} />
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(GAME_ICONS).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={label}
                aria-pressed={icon === key}
                className={`flex aspect-square items-center justify-center rounded-xl border-2 border-line ${
                  icon === key ? "bg-ink text-white" : "bg-paper"
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Kleur</span>
          <ColorPicker name="color" defaultValue={(game?.color as Color) ?? "red"} />
        </div>
        <div>
          <label className="label" htmlFor="description">
            Korte omschrijving <span className="font-bold text-muted">(optioneel)</span>
          </label>
          <input id="description" name="description" className="input" maxLength={500} defaultValue={game?.description ?? ""} placeholder="bijv. Racen met vier man op de Switch" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="min_players">
              Min. spelers
            </label>
            <input id="min_players" name="min_players" type="number" min={1} max={50} className="input" defaultValue={game?.min_players ?? 2} />
          </div>
          <div>
            <label className="label" htmlFor="max_players">
              Max. spelers
            </label>
            <input id="max_players" name="max_players" type="number" min={1} max={50} className="input" defaultValue={game?.max_players ?? ""} placeholder="geen" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <p className="pixel mb-1 text-[10px] text-red">SCOREREGELS</p>
          <p className="text-sm text-muted">Hoe wordt een potje gewonnen, en hoeveel ranglijstpunten krijg je?</p>
        </div>
        <input type="hidden" name="scoring_mode" value={mode} />
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["highest_wins", "Hoogste score wint", "bijv. punten, munten", ArrowUpWideNarrow],
              ["lowest_wins", "Laagste score wint", "bijv. golf, tijd", ArrowDownWideNarrow],
            ] as const
          ).map(([key, label, hint, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={`rounded-xl border-2 border-line p-3 text-left ${mode === key ? "bg-blue text-white shadow-[0_3px_0_var(--color-line)]" : "bg-paper"}`}
            >
              <Icon size={20} strokeWidth={2.5} />
              <p className="mt-1 text-sm font-black leading-tight">{label}</p>
              <p className={`text-xs ${mode === key ? "opacity-80" : "text-muted"}`}>{hint}</p>
            </button>
          ))}
        </div>
        <div>
          <span className="label">Ranglijstpunten per plek</span>
          <div className="grid grid-cols-6 gap-1.5">
            {PLACES.map((pl, i) => (
              <label key={pl} className="text-center">
                <span className="pixel mb-1 block text-[9px] text-muted">{pl}</span>
                <input
                  name={`p${i + 1}`}
                  type="number"
                  min={0}
                  max={999}
                  inputMode="numeric"
                  className="input h-11 min-h-0 px-1 text-center font-black"
                  defaultValue={points[i] ?? ""}
                />
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Leeg = 0 punten. Gedeelde plek = zelfde punten.</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line bg-paper p-3 has-[:checked]:bg-purple-soft">
          <input
            type="checkbox"
            name="is_team"
            defaultChecked={game?.is_team ?? false}
            className="mt-1 h-5 w-5 shrink-0 accent-[#7b4fd6]"
          />
          <span>
            <span className="block text-sm font-black">Teamspel</span>
            <span className="block text-xs text-muted">
              Iedereen met de hoogste score wint samen (bijv. Weerwolven, Secret Hitler). Tip: geef de winnaars 1
              punt en de rest 0. Staat iedereen gelijk, dan is er geen winnaar.
            </span>
          </span>
        </label>
        <div>
          <label className="label" htmlFor="participation_points">
            Bonus voor meedoen
          </label>
          <input
            id="participation_points"
            name="participation_points"
            type="number"
            min={0}
            max={999}
            className="input"
            defaultValue={game?.participation_points ?? 0}
          />
          <p className="mt-1 text-xs text-muted">Extra punten die iedere speler krijgt per potje.</p>
        </div>
      </section>

      <section className="card p-5">
        <label className="label" htmlFor="rules">
          Spelregels & huisregels <span className="font-bold text-muted">(optioneel)</span>
        </label>
        <textarea
          id="rules"
          name="rules"
          className="input min-h-[140px]"
          maxLength={4000}
          defaultValue={game?.rules ?? ""}
          placeholder={"bijv.\n• 150cc, items op normaal\n• 4 races per potje\n• Blauwe schelp = drankje"}
        />
      </section>

      <SubmitButton pendingText="Opslaan…">{submitLabel}</SubmitButton>
    </form>
  );
}
