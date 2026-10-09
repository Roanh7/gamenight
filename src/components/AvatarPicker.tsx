"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

/** Emoji's per categorie (allemaal standaard iPhone-emoji's). */
const GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "🎮 Gaming",
    emojis: ["👾", "🎮", "🕹️", "🎲", "🃏", "♟️", "🎯", "🏆", "🥇", "👑", "💎", "⭐", "🌟", "🍄", "🪙", "💣", "🛡️", "⚔️", "🗡️", "🏹", "🧩", "🎰", "🚀", "🛸"],
  },
  {
    label: "😎 Koppies",
    emojis: ["😎", "🤓", "🥸", "🤠", "🥳", "😈", "👿", "🤡", "👻", "💀", "☠️", "👽", "🤖", "🎃", "😤", "🤯", "🥶", "🥵", "😏", "🫡", "🤫", "🧐", "😴", "🤑", "🙃", "😵‍💫", "🫠", "🤪", "😇", "🫥"],
  },
  {
    label: "🦸 Figuren",
    emojis: ["🥷", "🧙", "🧛", "🧟", "🧞", "🧜", "🧚", "🦸", "🦹", "🤴", "👸", "🕵️", "👨‍🚀", "👨‍🍳", "👨‍🎤", "🧑‍💻", "💂", "🎅", "🤺", "🏄", "🏂", "🧗", "🏋️", "⛹️"],
  },
  {
    label: "🦊 Dieren",
    emojis: ["🐸", "🦊", "🐼", "🦁", "🐯", "🐻", "🐨", "🐵", "🙈", "🐶", "🐱", "🐭", "🐰", "🐷", "🐮", "🐔", "🐧", "🦉", "🦅", "🦆", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🦋", "🐌", "🐢", "🐍", "🦖", "🦕", "🐙", "🦑", "🦀", "🐠", "🐬", "🐳", "🦈", "🐊", "🦍", "🦥", "🦦", "🦩", "🐉", "🐲"],
  },
  {
    label: "🍕 Eten",
    emojis: ["🍕", "🌮", "🌯", "🍔", "🍟", "🌭", "🍗", "🥩", "🍣", "🍜", "🍝", "🥨", "🧀", "🥑", "🌶️", "🍉", "🍓", "🍌", "🍍", "🥥", "🍩", "🍪", "🎂", "🍦", "🍿", "🧃", "☕", "🧋", "🍺", "🥤"],
  },
  {
    label: "⚽ Sport",
    emojis: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏓", "🏸", "🥊", "🥋", "⛳", "🎳", "🏒", "🛹", "🏎️", "🏁", "🚴", "🏊", "⛷️", "🎿"],
  },
  {
    label: "🔥 Overig",
    emojis: ["🔥", "⚡", "💥", "✨", "🌈", "☄️", "🌙", "☀️", "🌊", "❄️", "🌵", "🌴", "🍀", "🌻", "🌹", "💯", "❤️‍🔥", "💜", "🖤", "🎸", "🎧", "🎤", "📸", "🧠", "👀", "💪", "🤘", "✌️", "🫶", "🪩", "🧸", "🎈", "🧨", "🗿", "🏴‍☠️", "🚨"],
  },
];

/** Kies een emoji als avatar, of gewoon je letter. */
export function AvatarPicker({
  userId,
  name,
  color,
  emoji,
}: {
  userId: string;
  name: string;
  color: string;
  emoji: string | null;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(emoji);
  const [tab, setTab] = useState(() => Math.max(0, GROUPS.findIndex((g) => emoji && g.emojis.includes(emoji))));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: string | null) {
    start(async () => {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_emoji: next, avatar_url: null })
        .eq("id", userId);
      if (error) {
        setError("Opslaan lukte niet.");
        return;
      }
      setCurrent(next);
      router.refresh();
    });
  }

  return (
    <div>
      <span className="label">Avatar</span>
      <div className="flex items-center gap-3">
        <Avatar name={name} color={color} emoji={current} size="lg" />
        {current && (
          <button type="button" onClick={() => save(null)} disabled={pending} className="btn btn-secondary btn-sm">
            <RotateCcw size={14} strokeWidth={2.5} /> Terug naar letter
          </button>
        )}
      </div>

      <p className="mb-1.5 mt-3 text-xs font-bold text-muted">Kies een emoji:</p>
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            onClick={() => setTab(i)}
            className={`chip shrink-0 px-3 py-1 text-xs ${tab === i ? "bg-ink text-white" : "bg-paper"}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1.5" role="tabpanel">
        {GROUPS[tab].emojis.map((em) => (
          <button
            key={em}
            type="button"
            disabled={pending}
            onClick={() => save(em)}
            aria-pressed={current === em}
            aria-label={`Kies ${em}`}
            className={`flex aspect-square items-center justify-center rounded-lg border-2 text-xl ${
              current === em ? "border-line bg-yellow" : "border-transparent bg-cream hover:border-line"
            }`}
          >
            {em}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 rounded-xl border-2 border-line bg-red-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}
    </div>
  );
}
