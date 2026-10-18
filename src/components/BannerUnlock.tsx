"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { bannerDef, RARITY } from "@/lib/banners";
import { playUnlock, soundOn } from "@/lib/sfx";
import { Banner, RarityChip } from "./Banner";

const KEY = "gn-banners-seen";

function seenLocally(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * "NEW BANNER UNLOCKED!" — verschijnt één keer per nieuwe banner.
 * We markeren hem meteen als gezien (database + dit toestel), dus herladen tijdens
 * de animatie laat hem niet nog een keer zien. In de collectie blijft hij gewoon staan.
 */
export function BannerUnlock({ ids, userId }: { ids: string[]; userId: string }) {
  const [queue, setQueue] = useState<string[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const local = seenLocally();
    const todo = ids.filter((id) => !local.has(`${userId}:${id}`));
    if (!todo.length) return;
    // Eén tik later tonen, zodat de pagina eerst rustig laadt
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify([...seenLocally(), ...todo.map((id) => `${userId}:${id}`)].slice(-200)));
      } catch {}
      void createClient().rpc("mark_banners_seen", { p_banners: todo });
      setQueue(todo);
      if (soundOn()) playUnlock();
    }, 400);
    return () => window.clearTimeout(t);
  }, [ids, userId]);

  if (!queue.length || i >= queue.length) return null;
  const def = bannerDef(queue[i]);
  const last = i === queue.length - 1;
  const next = () => {
    if (!last && soundOn()) playUnlock();
    setI(i + 1);
  };

  return (
    <div className="unlock-overlay" role="dialog" aria-modal="true" aria-label={`Nieuwe banner: ${def.name}`}>
      <div className="unlock-card">
        <p className="pixel blink text-center text-[11px] leading-relaxed text-yellow">🎉 NEW BANNER UNLOCKED!</p>
        <div className={`rarity-frame r-${def.rarity} unlock-pop mt-4 h-24`}>
          <Banner id={def.id} />
        </div>
        <p className="pixel mt-4 text-center text-[14px] leading-relaxed">
          {def.emoji} {def.name.toUpperCase()}
        </p>
        <div className="mt-2 flex justify-center">
          <RarityChip rarity={def.rarity} />
        </div>
        <p className="mt-2 text-center text-sm font-bold opacity-80">{def.how}</p>
        {queue.length > 1 && (
          <p className="pixel mt-2 text-center text-[8px] opacity-60">
            {i + 1} / {queue.length}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/account/banners" className="btn btn-primary btn-sm" onClick={() => setI(queue.length)}>
            VIEW BANNER
          </Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={next} autoFocus>
            {last ? "OK" : "VOLGENDE ▶"}
          </button>
        </div>
        {RARITY[def.rarity].announce && <p className="mt-3 text-center text-[11px] opacity-70">Iedereen ziet het in het nieuws. Opscheppen mag.</p>}
      </div>
    </div>
  );
}
