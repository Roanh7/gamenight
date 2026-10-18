"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { activeBoards, pendingMatches, ScoreSync } from "@/lib/scoreSync";

/**
 * Draait op elke pagina: stuurt scores die nog alleen op dit apparaat staan alsnog naar de
 * server (bijv. als je tijdens een potje per ongeluk naar Home ging of even geen bereik had).
 * Zolang dat niet gelukt is, staat er een melding bovenaan.
 */
export function ScoreSyncAgent() {
  const [waiting, setWaiting] = useState<{ matchId: string; nightId: string; label: string; count: number }[]>([]);

  useEffect(() => {
    let busy = false;
    const run = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        for (const p of pendingMatches()) {
          if (activeBoards.has(p.matchId)) continue;
          await ScoreSync.get(p.matchId, p.kind, p.nightId, p.label).flush();
        }
      } finally {
        busy = false;
        setWaiting(pendingMatches().filter((p) => !activeBoards.has(p.matchId)));
      }
    };
    void run();
    const iv = setInterval(run, 15000);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(iv);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  if (!waiting.length) return null;
  const w = waiting[0];
  const n = waiting.reduce((t, x) => t + x.count, 0);
  return (
    <div role="status" className="mx-auto mb-3 max-w-xl px-4">
      <Link
        href={`/agenda/${w.nightId}/host/potje/${w.matchId}`}
        className="flex items-center gap-2 rounded-2xl border-2 border-line bg-orange px-3 py-2 text-sm font-bold text-white"
      >
        <span>📴</span>
        <span className="min-w-0 flex-1">
          {n} {n === 1 ? "scorewijziging staat" : "scorewijzigingen staan"} nog alleen op dit apparaat
          {w.label ? ` (${w.label})` : ""}. Ze worden verstuurd zodra je verbinding hebt.
        </span>
        <span className="shrink-0 underline">Open</span>
      </Link>
    </div>
  );
}
