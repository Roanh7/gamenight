"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { xpInfo } from "@/lib/xp";
import { playFanfare, playXp, soundOn } from "@/lib/sfx";

const KEY = "gn-xp-seen";
const BLOCKS = 12;

function readSeen(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? (v as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function writeSeen(userId: string, xp: number) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readSeen(), [userId]: xp }));
  } catch {}
}

/**
 * XP-balk op de Player Card. Heb je sinds je vorige bezoek XP verdiend, dan telt de balk zichtbaar op
 * ("+35 XP"), en bij een nieuw level verschijnt één keer LEVEL UP!
 * De XP zelf komt van de server (ongewijzigde berekening); dit toestel onthoudt alleen wat je al zag.
 * Eerste bezoek op een toestel, of minder XP door een correctie: stil bijwerken, geen animatie.
 */
export function XpPanel({ userId, xp }: { userId: string; xp: number }) {
  const [shown, setShown] = useState(xp);
  const [gain, setGain] = useState(0);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number; title: string; newTitle: boolean } | null>(null);
  const raf = useRef(0);

  // Vóór het tekenen terug naar de stand die je al kende (zodat de balk niet eerst "vol" flitst)
  useLayoutEffect(() => {
    const seen = readSeen()[userId];
    if (typeof seen === "number" && seen >= 0 && seen < xp) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hangt af van wat dit toestel al zag
      setShown(seen);
    } else {
      setShown(xp);
      if (seen !== xp) writeSeen(userId, xp);
    }
  }, [userId, xp]);

  useEffect(() => {
    const from = readSeen()[userId];
    if (typeof from !== "number" || from < 0 || from >= xp) return;
    let cancelled = false;
    let wait = 0;
    const start = () => {
      if (cancelled) return;
      // Wacht tot een eventuele "new banner/frame"-pop-up weg is
      if (document.querySelector(".unlock-overlay")) {
        wait = window.setTimeout(start, 600);
        return;
      }
      writeSeen(userId, xp); // meteen onthouden: herladen speelt hem niet nog eens af
      setGain(xp - from);
      if (soundOn()) playXp();
      const finish = () => {
        setShown(xp);
        const a = xpInfo(from);
        const b = xpInfo(xp);
        if (b.level > a.level) {
          setLevelUp({ from: a.level, to: b.level, title: b.title, newTitle: b.title !== a.title });
          if (soundOn()) playFanfare();
        }
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
      const dur = Math.min(2400, 700 + (xp - from) * 14);
      const t0 = performance.now();
      const step = (now: number) => {
        if (cancelled) return;
        const k = Math.min(1, (now - t0) / dur);
        const eased = 1 - (1 - k) * (1 - k);
        if (k < 1) {
          setShown(Math.round(from + (xp - from) * eased));
          raf.current = requestAnimationFrame(step);
        } else finish();
      };
      raf.current = requestAnimationFrame(step);
    };
    wait = window.setTimeout(start, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(wait);
      cancelAnimationFrame(raf.current);
    };
  }, [userId, xp]);

  const info = xpInfo(shown);
  const filled = Math.min(BLOCKS, Math.floor((info.into / info.span) * BLOCKS));
  const counting = shown !== xp;

  return (
    <>
      <div className={`xp-panel mt-3 ${counting ? "is-counting" : ""}`}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="pixel flex items-center gap-2 text-[9px] text-red">
            XP
            {gain > 0 && (
              <span className="xp-gain pixel" role="status">
                +{gain} XP
              </span>
            )}
          </span>
          <span className="pixel text-[9px]">
            {info.into}/{info.span}
          </span>
        </div>
        <div className="mt-1.5 flex gap-[3px]" role="img" aria-label={`${info.into} van ${info.span} XP naar level ${info.level + 1}`}>
          {Array.from({ length: BLOCKS }, (_, i) => (
            <span key={i} className={`xp-block ${i < filled ? "is-on" : ""}`} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-bold text-muted">
          {info.xp} XP totaal · nog {info.toNext} tot LV {info.level + 1}
        </p>
      </div>

      {levelUp && (
        <div className="unlock-overlay" role="dialog" aria-modal="true" aria-label={`Level ${levelUp.to} bereikt`}>
          <div className="unlock-card text-center">
            <p className="pixel blink text-[13px] leading-relaxed text-yellow">★ LEVEL UP! ★</p>
            <div className="unlock-pop mt-5 flex items-center justify-center gap-3">
              <span className="pixel rounded-md border-2 border-[#050409] bg-[#3a3550] px-2 py-2 text-[12px] opacity-70">LV {levelUp.from}</span>
              <span className="pixel text-[12px] text-yellow">▶</span>
              <span className="lvl-new pixel rounded-md border-2 border-[#050409] bg-red px-3 py-3 text-[20px]">LV {levelUp.to}</span>
            </div>
            <p className="pixel mt-5 text-[10px] leading-relaxed">
              {levelUp.newTitle ? "NIEUWE TITEL: " : ""}
              {levelUp.title.toUpperCase()}
            </p>
            <p className="mt-2 text-sm font-bold opacity-80">+{gain} XP verdiend. Lekker bezig!</p>
            <button type="button" className="btn btn-primary btn-sm mt-5 w-full" onClick={() => setLevelUp(null)} autoFocus>
              VERDER ▶
            </button>
          </div>
        </div>
      )}
    </>
  );
}
