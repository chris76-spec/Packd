export interface Targets {
  sleep_minutes: number;
  steps: number;
  training_minutes: number;
}

export interface Baselines {
  steps?: number;
  sleep_minutes?: number;
  resting_hr?: number;
  hrv?: number;
  computed_at?: string;
}

export interface User {
  id: string;
  name: string;
  timezone: string;
  google_health_connected: boolean;
  targets_json: Targets;
  baselines_json: Baselines;
}

export interface Matchup {
  id: string;
  user_a: string;
  user_b: string;
  season_start: string;
}

export interface SleepStages {
  deep_minutes: number;
  rem_minutes: number;
  light_minutes: number;
  awake_minutes?: number;
}

export interface DailyMetrics {
  id?: string;
  user_id: string;
  date: string;
  steps: number | null;
  sleep_minutes: number | null;
  sleep_stages_json: SleepStages | null;
  resting_hr: number | null;
  hrv: number | null;
  active_calories: number | null;
  source_synced_at?: string | null;
}

export type SessionType = "gym" | "badminton" | "run" | "other";

export interface WorkoutSession {
  id?: string;
  user_id: string;
  date: string;
  type: SessionType;
  duration_min: number;
  auto_detected: boolean;
}

export interface PillarPoints {
  sleep_pts: number;
  steps_pts: number;
  exercise_pts: number;
  recovery_pts: number;
  calorie_bonus: number;
  total: number;
  is_rest_day: boolean;
}

export interface DailyScore extends PillarPoints {
  id?: string;
  user_id: string;
  date: string;
  locked?: boolean;
}

export type DuelType = "daily" | "recovery";

export interface Duel {
  id?: string;
  matchup_id: string;
  date: string;
  type: DuelType;
  user_a_score: number;
  user_b_score: number;
  winner: string | null;
}

export interface WeeklyRow {
  id?: string;
  matchup_id: string;
  week_start: string;
  user_a_total: number;
  user_b_total: number;
  winner: string | null;
  shared_goal_target: number;
  shared_goal_progress: number;
  shared_goal_met: boolean | null;
}

export interface CommentaryLine {
  message: string;
  tone: "trash_talk" | "insight" | "hype";
}
