"use client";

import { useEffect, useState } from "react";

/**
 * Zoeken in de uitleg, helemaal op het toestel zelf (geen zoekdienst).
 * Filtert de uitklapbare hoofdstukken (details[data-help]) op hun tekst en klapt de treffers open.
 * Opent ook het juiste hoofdstuk als je via een link (#punten) binnenkomt.
 */
export function HelpSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<number | null>(null);

  // Link naar #hoofdstuk → dat hoofdstuk openklappen
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  useEffect(() => {
    const all = [...document.querySelectorAll<HTMLDetailsElement>("details[data-help]")];
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) {
      for (const d of all) {
        d.hidden = false;
        if (d.dataset.autoOpen) {
          d.open = false;
          delete d.dataset.autoOpen;
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits(null);
      return;
    }
    let n = 0;
    for (const d of all) {
      const text = (d.textContent ?? "").toLowerCase();
      const match = words.every((w) => text.includes(w));
      d.hidden = !match;
      if (match) {
        n++;
        if (!d.open) {
          d.open = true;
          d.dataset.autoOpen = "1";
        }
      }
    }
    setHits(n);
  }, [q]);

  return (
    <div className="mb-3">
      <label htmlFor="help-search" className="sr-only">
        Zoek in de uitleg
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm" aria-hidden>
          🔍
        </span>
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Zoek, bijv. underdog, XP, host…"
          className="input pl-9"
          autoComplete="off"
        />
      </div>
      {hits !== null && (
        <p className="mt-1.5 text-xs font-bold text-muted" role="status">
          {hits === 0 ? "Niets gevonden. Probeer een ander woord." : `${hits} ${hits === 1 ? "hoofdstuk" : "hoofdstukken"} gevonden en opengeklapt`}
        </p>
      )}
    </div>
  );
}
