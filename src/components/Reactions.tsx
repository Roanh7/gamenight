"use client";

import { useState } from "react";
import { SmilePlus } from "lucide-react";
import { toggleCommentReaction, toggleReaction } from "@/app/social-actions";

export const REACTION_EMOJIS = ["🔥", "😂", "👏", "🧂", "💀", "👑"] as const;

type Counts = Record<string, { n: number; mine: boolean; names: string[] }>;

/** Emoji-reacties onder een nieuwsbericht of een comment; werkt direct (optimistisch). */
export function Reactions({
  activityId,
  commentId,
  myName,
  initial,
  small,
}: {
  activityId?: number;
  commentId?: number;
  userId?: string;
  myName: string;
  initial: Counts;
  small?: boolean;
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
    const res = await (commentId
      ? toggleCommentReaction(commentId, emoji, !cur.mine)
      : toggleReaction(activityId!, emoji, !cur.mine)
    ).catch(() => ({ ok: false }));
    if (!res.ok) setCounts(counts); // terugdraaien bij fout
  }

  const shown = REACTION_EMOJIS.filter((e) => (counts[e]?.n ?? 0) > 0);

  return (
    <div className={`flex flex-wrap items-center gap-1 ${small ? "mt-0.5" : "mt-1.5"}`}>
      {shown.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => toggle(e)}
          title={counts[e].names.join(", ")}
          aria-pressed={counts[e].mine}
          className={`inline-flex items-center gap-1 rounded-full border-2 font-black ${small ? "h-6 px-1.5 text-[11px]" : "h-7 px-2 text-xs"} ${
            counts[e].mine ? "border-line bg-yellow-soft" : "border-soft bg-paper"
          }`}
        >
          <span className={`leading-none ${small ? "text-xs" : "text-sm"}`}>{e}</span>
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
              className={`flex items-center justify-center rounded-full hover:bg-cream ${small ? "h-6 w-6 text-sm" : "h-7 w-7 text-base"}`}
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
          className={`inline-flex items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink ${small ? "h-6 w-6" : "h-7 w-7"}`}
          aria-label="Reageren"
        >
          <SmilePlus size={small ? 14 : 16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
