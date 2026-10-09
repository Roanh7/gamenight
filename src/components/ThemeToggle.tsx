"use client";

import { useEffect, useState } from "react";

type Mode = "auto" | "light" | "dark";

function applyTheme(m: Mode) {
  const root = document.documentElement;
  if (m === "auto") {
    delete root.dataset.theme;
    document.cookie = "gn-theme=; path=/; max-age=0; samesite=lax";
  } else {
    root.dataset.theme = m;
    document.cookie = `gn-theme=${m}; path=/; max-age=31536000; samesite=lax`;
  }
}

/** Licht, donker, of automatisch zoals je iPhone (onthouden op dit toestel). */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- instelling staat in de pagina
    setMode(t === "light" || t === "dark" ? t : "auto");
  }, []);

  function pick(m: Mode) {
    setMode(m);
    applyTheme(m);
  }

  return (
    <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Weergave">
      {(
        [
          ["auto", "📱 Auto"],
          ["light", "☀️ Licht"],
          ["dark", "🌙 Nacht"],
        ] as const
      ).map(([m, label]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => pick(m)}
          className={`btn btn-sm ${mode === m ? "btn-yellow" : "btn-secondary"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
