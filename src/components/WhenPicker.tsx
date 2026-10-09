"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, Plus, X } from "lucide-react";
import { DateTimeField } from "./DateTimeField";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Vrijdag en zaterdag van komende week, 20:00. */
function defaults() {
  const fri = new Date();
  fri.setDate(fri.getDate() + ((5 - fri.getDay() + 7) % 7 || 7));
  fri.setHours(20, 0, 0, 0);
  const sat = new Date(fri);
  sat.setDate(sat.getDate() + 1);
  return [toLocalInput(fri), toLocalInput(sat)];
}

/** Kies: één vaste datum, of een datumprikker met 2 tot 5 opties. */
export function WhenPicker() {
  const [mode, setMode] = useState<"fixed" | "poll">("fixed");
  const [options, setOptions] = useState<string[]>([]);

  // Tijdzone van de browser, daarom pas na het laden invullen.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(defaults());
  }, []);

  function add() {
    setOptions((o) => {
      const last = o.at(-1) ? new Date(o.at(-1) as string) : new Date();
      last.setDate(last.getDate() + 1);
      return [...o, toLocalInput(last)];
    });
  }

  return (
    <div>
      <span className="label">Wanneer?</span>
      <input type="hidden" name="date_mode" value={mode} />
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["fixed", "Vaste datum", "Ik weet al wanneer", CalendarCheck],
            ["poll", "Datumprikker", "Laat iedereen kiezen wanneer ze kunnen", CalendarDays],
          ] as const
        ).map(([val, label, hint, Icon]) => (
          <button
            key={val}
            type="button"
            onClick={() => setMode(val)}
            aria-pressed={mode === val}
            className={`rounded-xl border-2 border-line p-3 text-left ${mode === val ? "bg-blue text-white shadow-[0_3px_0_var(--color-line)]" : "bg-paper"}`}
          >
            <Icon size={20} strokeWidth={2.5} />
            <p className="mt-1 text-sm font-black leading-tight">{label}</p>
            <p className={`text-xs leading-tight ${mode === val ? "opacity-80" : "text-muted"}`}>{hint}</p>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {mode === "fixed" ? (
          <DateTimeField name="starts_at" />
        ) : (
          <div className="space-y-2">
            {options.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="pixel w-5 text-[11px] text-muted">{i + 1}</span>
                <input
                  type="datetime-local"
                  required
                  aria-label={`Optie ${i + 1}`}
                  className="input min-w-0 flex-1"
                  value={v}
                  onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                />
                <input type="hidden" name="date_options" value={v ? new Date(v).toISOString() : ""} />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-line bg-paper"
                    aria-label={`Optie ${i + 1} weghalen`}
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <button type="button" onClick={add} className="btn btn-secondary btn-sm">
                <Plus size={16} strokeWidth={3} /> Optie toevoegen
              </button>
            )}
            <p className="text-xs text-muted">
              Iedereen tikt aan wanneer ze kunnen. Daarna kies jij (of de host) de beste datum.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
