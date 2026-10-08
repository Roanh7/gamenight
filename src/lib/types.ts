export type Color =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "pink"
  | "teal";

export const COLORS: Color[] = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "teal"];

export type Profile = {
  id: string;
  username: string;
  avatar_color: Color;
  bio: string | null;
  created_at: string;
};

export type Game = {
  id: string;
  name: string;
  icon: string;
  color: Color;
  description: string | null;
  rules: string | null;
  min_players: number;
  max_players: number | null;
  scoring_mode: "highest_wins" | "lowest_wins";
  placement_points: number[];
  participation_points: number;
  created_by: string | null;
  created_at: string;
};

export type NightStatus = "planned" | "live" | "finished" | "cancelled";

export type GameNight = {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  notes: string | null;
  host_id: string;
  status: NightStatus;
  created_by: string | null;
  created_at: string;
};

export type Participant = {
  night_id: string;
  user_id: string;
  status: "pending" | "confirmed";
};

export type Vote = { night_id: string; user_id: string; game_id: string };

export type Match = {
  id: string;
  night_id: string;
  game_id: string;
  status: "live" | "finished";
  winner_id: string | null;
  is_draw: boolean;
  created_at: string;
  finished_at: string | null;
};

export type MatchResult = {
  match_id: string;
  user_id: string;
  game_id: string;
  total: number;
  placement: number;
  league_points: number;
  is_winner: boolean;
};

export type LeaderboardRow = {
  game_id: string;
  user_id: string;
  played: number;
  wins: number;
  points: number;
  avg_score: number | null;
  rank: number;
};

export type OverallRow = {
  user_id: string;
  played: number;
  wins: number;
  points: number;
  games_played: number;
  rank: number;
};

export type Activity = {
  id: number;
  type: "member_joined" | "game_added" | "night_planned" | "match_finished" | "rank_up" | string;
  actor_id: string | null;
  game_id: string | null;
  night_id: string | null;
  match_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};
