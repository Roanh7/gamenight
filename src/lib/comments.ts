/** Gedeeld tussen server en browser: hoe een comment eruitziet. */
export type CommentRow = {
  id: number;
  activity_id: number;
  user_id: string;
  body: string;
  created_at: string;
  profiles: { username: string; avatar_color: string; avatar_emoji: string | null } | null;
};

export const COMMENT_SELECT = "id, activity_id, user_id, body, created_at, profiles(username, avatar_color, avatar_emoji)";
