"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const REACTION_EMOJIS = ["🔥", "😂", "👏", "🧂", "💀", "👑"] as const;

type Counts = Record<string, { n: number; mine: boolean; names: string[] }>;

/** Emoji-reacties onder een nieuwsbericht; werkt direct (optimistisch). */
export function Reactions({
  activityId,
  userId,
  myName,
  initial,
}: {
  activityId: number;
  userId: string;
  myName: string;
  initial: Counts;
}) {
  const [counts, setCounts] = useState<Counts>(initial);
  const [open, setOpen] = useState(false);

  async function toggle(emoji: string) {
    const cur = counts[emoji] ?? { n: 0, mine: false, names: [] };
    const next: Counts = {
      ...counts,
      [emoji]: cur.mine
        ? { n: cur.n - 1, mine: false, names: cur.names.filter((x) => x !== myName) }
        : { n: cur.n + 1, mine: true, names: [...cur.names, myName] },
    };
    setCounts(next);
    setOpen(false);
    const supabase = createClient();
    const { error } = cur.mine
      ? await supabase.from("reactions").delete().eq("activity_id", activityId).eq("user_id", userId).eq("emoji", emoji)
      : await supabase.from("reactions").insert({ activity_id: activityId, user_id: userId, emoji });
    if (error && !error.message.includes("duplicate")) setCounts(counts); // terugdraaien bij fout
  }

  const shown = REACTION_EMOJIS.filter((e) => (counts[e]?.n ?? 0) > 0);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {shown.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => toggle(e)}
          title={counts[e].names.join(", ")}
          aria-pressed={counts[e].mine}
          className={`inline-flex h-7 items-center gap-1 rounded-full border-2 px-2 text-xs font-black ${
            counts[e].mine ? "border-line bg-yellow-soft" : "border-soft bg-paper"
          }`}
        >
          <span className="text-sm leading-none">{e}</span>
          {counts[e].n}
        </button>
      ))}
      {open ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border-2 border-line bg-paper px-1">
          {REACTION_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggle(e)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-base hover:bg-cream"
              aria-label={`Reageer met ${e}`}
            >
              {e}
            </button>
          ))}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
          aria-label="Reageren"
        >
          <SmilePlus size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
