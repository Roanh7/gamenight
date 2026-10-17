/** Gedeeld tussen server en browser: hoe een comment eruitziet. */
export type CommentRow = {
  id: number;
  activity_id: number;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; avatar_color: string; avatar_emoji: string | null } | null;
  comment_reactions: { user_id: string; emoji: string; profiles: { username: string } | null }[];
};

export type ReactionCounts = Record<string, { n: number; mine: boolean; names: string[] }>;

/** Zet de reacties op een comment om naar tellingen per emoji. */
export function countReactions(rows: CommentRow["comment_reactions"], meId: string): ReactionCounts {
  const out: ReactionCounts = {};
  for (const r of rows ?? []) {
    const e = out[r.emoji] ?? { n: 0, mine: false, names: [] };
    e.n += 1;
    e.mine ||= r.user_id === meId;
    if (r.profiles?.username) e.names.push(r.profiles.username);
    out[r.emoji] = e;
  }
  return out;
}

export const COMMENT_SELECT = "id, activity_id, user_id, body, created_at, profiles!comments_user_id_fkey(username, avatar_color, avatar_emoji), comment_reactions(user_id, emoji, profiles!comment_reactions_user_id_fkey(username))";
