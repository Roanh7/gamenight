"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { activeBoards, ScoreSync, type Kind } from "./scoreSync";

type Row = { key: string; points: number | null; version: number };

/** Koppelt een scorebord aan de opslagmotor van het potje. */
export function useScoreSync(matchId: string, kind: Kind, nightId: string, label: string, initial: Row[]) {
  const engine = useMemo(() => ScoreSync.get(matchId, kind, nightId, label), [matchId, kind, nightId, label]);
  const [mounted, setMounted] = useState(false);

  // Serverstand altijd meenemen (oudere info wint nooit)
  useMemo(() => engine.merge(initial, true), [engine, initial]);

  const subscribe = useCallback((cb: () => void) => engine.subscribe(cb), [engine]);
  useSyncExternalStore(
    subscribe,
    () => engine.snapshot,
    () => 0,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pas na het laden lokale wijzigingen tonen
    setMounted(true);
    activeBoards.add(matchId);
    const kick = () => {
      if (document.visibilityState !== "visible") return;
      void engine.refresh();
      if (engine.count()) void engine.flush();
    };
    kick();
    const iv = setInterval(kick, 4000);
    window.addEventListener("online", kick);
    window.addEventListener("focus", kick);
    document.addEventListener("visibilitychange", kick);
    return () => {
      activeBoards.delete(matchId);
      clearInterval(iv);
      window.removeEventListener("online", kick);
      window.removeEventListener("focus", kick);
      document.removeEventListener("visibilitychange", kick);
    };
  }, [engine, matchId]);

  /** Waarde voor op het scherm (eerste keer tekenen: alleen de serverstand, zoals de server hem ook tekende). */
  const value = (key: string) => (mounted ? engine.value(key) : (engine.known[key]?.points ?? null));
  return { engine, value, mounted };
}
