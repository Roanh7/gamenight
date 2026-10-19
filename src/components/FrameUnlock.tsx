"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FRAME_BY_ID, frameUnlockId } from "@/lib/frames";
import { playUnlock, soundOn } from "@/lib/sfx";
import { equipFrame } from "@/app/account/actions";
import { Avatar } from "./Avatar";

const KEY = "gn-frames-seen";

function seenLocally(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * "🏆 NEW FRAME UNLOCKED!" — één keer per nieuw frame (database + dit toestel onthouden het meteen),
 * dus geen dubbele meldingen, ook niet bij herladen of op een tweede tabblad.
 */
export function FrameUnlock({
  ids,
  userId,
  name,
  color,
  emoji,
  pixel,
}: {
  ids: string[];
  userId: string;
  name: string;
  color: string;
  emoji: string | null;
  pixel: unknown;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const local = seenLocally();
    const todo = ids.filter((id) => FRAME_BY_ID.has(id) && !local.has(`${userId}:${id}`));
    if (!todo.length) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify([...seenLocally(), ...todo.map((id) => `${userId}:${id}`)].slice(-200)));
      } catch {}
      void createClient().rpc("mark_banners_seen", { p_banners: todo.map(frameUnlockId) });
      setQueue(todo);
      if (soundOn()) playUnlock();
    }, 400);
    return () => window.clearTimeout(t);
  }, [ids, userId]);

  if (!queue.length || i >= queue.length) return null;
  const def = FRAME_BY_ID.get(queue[i])!;
  const last = i === queue.length - 1;
  const next = () => {
    setErr(null);
    if (!last && soundOn()) playUnlock();
    setI(i + 1);
  };
  const equip = () =>
    start(async () => {
      const res = await equipFrame(def.id);
      if (res.error) return setErr(res.error);
      setI(queue.length);
      router.refresh();
    });

  return (
    <div className="unlock-overlay" role="dialog" aria-modal="true" aria-label={`Nieuw frame: ${def.name}`}>
      <div className="unlock-card">
        <p className="pixel blink text-center text-[11px] leading-relaxed text-yellow">🏆 NEW FRAME UNLOCKED!</p>
        <div className="unlock-pop mt-4 flex justify-center">
          <Avatar name={name} color={color} emoji={emoji} pixel={pixel} frame={def.id} size="hero" />
        </div>
        <p className="pixel mt-4 text-center text-[14px] leading-relaxed">
          {def.emoji} {def.name.toUpperCase()}
        </p>
        <p className="mt-2 text-center text-sm font-bold opacity-80">{def.how}</p>
        {queue.length > 1 && (
          <p className="pixel mt-2 text-center text-[8px] opacity-60">
            {i + 1} / {queue.length}
          </p>
        )}
        {err && <p className="mt-2 text-center text-xs font-bold text-red">{err}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-primary btn-sm" onClick={equip} disabled={pending}>
            EQUIP NOW
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={next} autoFocus>
            {last ? "LATER" : "VOLGENDE ▶"}
          </button>
        </div>
      </div>
    </div>
  );
}
