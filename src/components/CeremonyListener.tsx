"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { unlockAudio } from "@/lib/sfx";

const KEY = "gn-podium-seen";
const memory = new Set<string>();

function seenKey(nightId: string, closedAt: string) {
  return `${nightId}@${new Date(closedAt).getTime()}`;
}

function isSeen(k: string) {
  if (memory.has(k)) return true;
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).includes(k);
  } catch {
    return false;
  }
}

/** Deze ceremonie is al getoond op dit toestel (geen tweede automatische start). */
export function markCeremonySeen(nightId: string, closedAt: string) {
  const k = seenKey(nightId, closedAt);
  memory.add(k);
  try {
    const list = (JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]).filter((x) => x !== k);
    localStorage.setItem(KEY, JSON.stringify([...list, k].slice(-30)));
  } catch {}
}

type Pending = { nightId: string; title: string };

/**
 * Luistert (Supabase Realtime) of een avond wordt afgesloten. Dan verschijnt er een melding
 * en start de Podium Ceremony na een paar tellen vanzelf. Dubbele meldingen worden genegeerd.
 */
export function CeremonyListener() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [pending, setPending] = useState<Pending | null>(null);
  const [count, setCount] = useState(5);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel("podium-ceremonies")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "night_ceremonies" },
        (payload) => {
          const row = payload.new as { night_id?: string; closed_at?: string; is_practice?: boolean } | null;
          if (!row?.night_id || !row.closed_at || row.is_practice) return;
          const k = seenKey(row.night_id, row.closed_at);
          if (isSeen(k)) return;
          memory.add(k);
          const nightId = row.night_id;
          // Even wachten: de host wordt zelf al naar de ceremonie gestuurd
          timer = setTimeout(async () => {
            if (pathRef.current?.startsWith(`/agenda/${nightId}/podium`)) return;
            const { data } = await supabase.from("game_nights").select("title, status").eq("id", nightId).maybeSingle();
            if (!data || data.status !== "finished") return;
            setCount(5);
            setPending({ nightId, title: data.title });
          }, 1500);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  // Aftellen tot de ceremonie vanzelf start
  useEffect(() => {
    if (!pending) return;
    if (count <= 0) {
      const id = pending.nightId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- melding sluiten bij het starten
      setPending(null);
      router.push(`/agenda/${id}/podium?auto=1`);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pending, count, router]);

  if (!pending) return null;
  return (
    <div
      className="fixed inset-x-0 top-0 z-[85] mx-auto max-w-md px-3"
      style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      role="alert"
    >
      <div className="unlock-card unlock-pop !max-w-none">
        <p className="pixel text-[10px] text-yellow">🏆 GAME NIGHT COMPLETE!</p>
        <p className="mt-1.5 truncate text-sm font-black">{pending.title} is afgesloten.</p>
        <p className="text-xs font-bold opacity-80">De Podium Ceremony begint over {count}…</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              unlockAudio(); // tik = toestemming voor geluid op iPhone
              const id = pending.nightId;
              setPending(null);
              router.push(`/agenda/${id}/podium?auto=1`);
            }}
          >
            ▶ Nu kijken
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPending(null)}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
