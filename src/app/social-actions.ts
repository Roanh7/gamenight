"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMMENT_SELECT, type CommentRow } from "@/lib/comments";
import { aboutActivity } from "@/lib/social";
import { pushLater } from "@/lib/push";

const EMOJIS = ["🔥", "😂", "👏", "🧂", "💀", "👑"];

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return { supabase, user, name: profile?.username ?? "Iemand" };
}

/** Emoji-reactie aan of uit. Bij aanzetten krijgt wie het bericht betreft een melding. */
export async function toggleReaction(activityId: number, emoji: string, on: boolean) {
  const ctx = await me();
  if (!ctx || !EMOJIS.includes(emoji)) return { ok: false };
  const { supabase, user, name } = ctx;
  const { error } = on
    ? await supabase.from("reactions").insert({ activity_id: activityId, user_id: user.id, emoji })
    : await supabase.from("reactions").delete().eq("activity_id", activityId).eq("user_id", user.id).eq("emoji", emoji);
  if (error && !error.message.includes("duplicate")) return { ok: false };
  if (on && !error) {
    const about = await aboutActivity(supabase, activityId);
    if (about) {
      pushLater(
        about.users,
        {
          title: `${emoji} ${name} reageerde`,
          body: `Op ${about.label}.`,
          url: `/nieuws#a-${activityId}`,
          tag: `reactie-${activityId}`,
        },
        user.id,
      );
    }
  }
  return { ok: true };
}

/** Comment plaatsen. Melding naar wie het bericht betreft en wie er eerder reageerde. */
export async function addComment(activityId: number, body: string) {
  const ctx = await me();
  const text = body.trim().slice(0, 500);
  if (!ctx || !text) return { ok: false as const };
  const { supabase, user, name } = ctx;
  const { data, error } = await supabase
    .from("comments")
    .insert({ activity_id: activityId, user_id: user.id, body: text })
    .select(COMMENT_SELECT)
    .single();
  if (error || !data) return { ok: false as const };

  const [about, { data: earlier }] = await Promise.all([
    aboutActivity(supabase, activityId),
    supabase.from("comments").select("user_id").eq("activity_id", activityId),
  ]);
  const users = [...new Set([...(about?.users ?? []), ...(earlier ?? []).map((c) => c.user_id as string)])];
  pushLater(
    users,
    {
      title: `💬 ${name}`,
      body: `${text.length > 90 ? text.slice(0, 90) + "…" : text}${about ? ` (bij ${about.label})` : ""}`,
      url: `/nieuws#a-${activityId}`,
      tag: `comment-${activityId}`,
    },
    user.id,
  );
  revalidatePath("/nieuws");
  revalidatePath("/");
  return { ok: true as const, comment: data as unknown as CommentRow };
}

/** Emoji-reactie op een comment. De schrijver van de comment krijgt een melding. */
export async function toggleCommentReaction(commentId: number, emoji: string, on: boolean) {
  const ctx = await me();
  if (!ctx || !EMOJIS.includes(emoji)) return { ok: false };
  const { supabase, user, name } = ctx;
  const { error } = on
    ? await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: user.id, emoji })
    : await supabase
        .from("comment_reactions")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
  if (error && !error.message.includes("duplicate")) return { ok: false };
  if (on && !error) {
    const { data: c } = await supabase
      .from("comments")
      .select("user_id, activity_id, body")
      .eq("id", commentId)
      .maybeSingle();
    if (c) {
      const body = String(c.body);
      pushLater(
        [c.user_id as string],
        {
          title: `${emoji} ${name} reageerde op je comment`,
          body: `"${body.length > 80 ? body.slice(0, 80) + "…" : body}"`,
          url: `/nieuws#a-${c.activity_id}`,
          tag: `comment-reactie-${commentId}`,
        },
        user.id,
      );
    }
  }
  return { ok: true };
}

export async function deleteComment(id: number) {
  const ctx = await me();
  if (!ctx) return { ok: false };
  const { error } = await ctx.supabase.from("comments").delete().eq("id", id).eq("user_id", ctx.user.id);
  revalidatePath("/nieuws");
  revalidatePath("/");
  return { ok: !error };
}
