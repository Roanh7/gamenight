"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COMMENT_SELECT, countReactions, type CommentRow } from "@/lib/comments";
import { Reactions } from "./Reactions";
import { addComment, deleteComment } from "@/app/social-actions";
import { timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Comments onder een nieuwsbericht: laatste 2 zichtbaar, de rest via "Laad alle comments". */
export function Comments({
  activityId,
  userId,
  myName,
  initial,
}: {
  activityId: number;
  userId: string;
  myName: string;
  initial: { count: number; latest: CommentRow[] };
}) {
  const [list, setList] = useState<CommentRow[]>(initial.latest);
  const [count, setCount] = useState(initial.count);
  const [all, setAll] = useState(initial.count <= initial.latest.length);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const { data } = await createClient()
      .from("comments")
      .select(COMMENT_SELECT)
      .eq("activity_id", activityId)
      .order("created_at", { ascending: true });
    if (data) {
      setList(data as unknown as CommentRow[]);
      setCount(data.length);
      setAll(true);
    }
    setLoading(false);
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    start(async () => {
      const res = await addComment(activityId, body).catch(() => null);
      if (res?.ok) {
        setList((l) => [...l, res.comment]);
        setCount((c) => c + 1);
        setText("");
      } else setError("Versturen lukte niet. Probeer het nog eens.");
    });
  }

  function remove(id: number) {
    setList((l) => l.filter((c) => c.id !== id));
    setCount((c) => c - 1);
    start(async () => {
      await deleteComment(id).catch(() => null);
    });
  }

  const hidden = count - list.length;

  return (
    <div className="mt-1">
      {!all && hidden > 0 && (
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="mb-1 text-xs font-black text-muted underline decoration-2 underline-offset-2 hover:text-ink"
        >
          {loading ? "Laden…" : `Laad alle ${count} comments`}
        </button>
      )}
      {list.length > 0 && (
        <ul className="space-y-1.5">
          {list.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <Avatar
                name={c.profiles?.username ?? "?"}
                color={c.profiles?.avatar_color}
                emoji={c.profiles?.avatar_emoji} pixel={c.profiles?.avatar_pixel} frame={c.profiles?.avatar_frame}
                size="xs"
              />
              <div className="min-w-0 flex-1 rounded-xl bg-cream px-2.5 py-1.5">
                <p className="text-[13px] leading-snug">
                  <b className="font-black">{c.profiles?.username ?? "Iemand"}</b>{" "}
                  <span className="whitespace-pre-line break-words">{c.body}</span>
                </p>
                <p className="text-[10px] text-muted">{timeAgo(c.created_at)}</p>
                <Reactions
                  commentId={c.id}
                  myName={myName}
                  initial={countReactions(c.comment_reactions, userId)}
                  small
                />
              </div>
              {c.user_id === userId && (
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label="Comment verwijderen"
                  className="mt-1 text-muted hover:text-ink"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={send} className="mt-1.5 flex items-center gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Schrijf een comment…"
            aria-label="Comment"
            className="input min-h-[38px] flex-1 py-1.5 text-base"
            autoFocus
          />
          <button type="submit" disabled={pending || !text.trim()} className="btn btn-primary btn-sm px-3" aria-label="Versturen">
            <Send size={15} strokeWidth={2.5} />
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-black text-muted hover:text-ink"
        >
          <MessageCircle size={14} strokeWidth={2.5} /> {count ? `Comment (${count})` : "Comment"}
        </button>
      )}
      {error && <p className="mt-1 text-xs font-bold text-red">{error}</p>}
    </div>
  );
}
