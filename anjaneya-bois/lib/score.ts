// The daily 0–100 total-fitness score (PRD §4).
// Four pillars, each scored as achievement vs the user's own target/baseline,
// capped at 1.0 so a huge day in one pillar can't paper over the rest.

import type { Baselines, DailyMetrics, PillarPoints, Targets, WorkoutSession } from "./types";

export const PILLAR_CAPS = {
  sleep: 25,
  steps: 20,
  exercise: 35,
  recovery: 20,
} as const;

export const CALORIE_BONUS_CAP = 3;

// Seeds used until ~2 weeks of real data exist (PRD: steps 8,000; sleep 450 min).
export const DEFAULT_TARGETS: Targets = {
  sleep_minutes: 450,
  steps: 8000,
  training_minutes: 60,
};

export function ratio(x: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.max(x / target, 0), 1);
}

// Sleep (25): duration vs target, + up to 7 quality pts when stages exist.
// Quality is the deep+REM share of sleep measured against a healthy band
// (~20–40% combined); at or above 40% earns the full 7.
export function sleepPoints(metrics: DailyMetrics, targets: Targets): number {
  const minutes = metrics.sleep_minutes ?? 0;
  const stages = metrics.sleep_stages_json;
  if (stages && minutes > 0) {
    const durationPts = ratio(minutes, targets.sleep_minutes) * 18;
    const restorative = (stages.deep_minutes + stages.rem_minutes) / minutes;
    const qualityPts = ratio(restorative, 0.4) * 7;
    return durationPts + qualityPts;
  }
  return ratio(minutes, targets.sleep_minutes) * PILLAR_CAPS.sleep;
}

export function stepsPoints(metrics: DailyMetrics, targets: Targets): number {
  return ratio(metrics.steps ?? 0, targets.steps) * PILLAR_CAPS.steps;
}

// Structured exercise (35): manual session log is the source of truth;
// auto-detected sessions count too but are a bonus path, not relied upon.
export function exercisePoints(sessions: WorkoutSession[], targets: Targets): number {
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_min, 0);
  return ratio(totalMinutes, targets.training_minutes) * PILLAR_CAPS.exercise;
}

// Recovery (20): HRV vs personal baseline when available, otherwise resting-HR
// trend — at/below baseline is full points, elevated scales down (each bpm
// above baseline costs 10% until zero at +10 bpm).
export function recoveryPoints(metrics: DailyMetrics, baselines: Baselines): number {
  if (metrics.hrv != null && baselines.hrv != null && baselines.hrv > 0) {
    return ratio(metrics.hrv, baselines.hrv) * PILLAR_CAPS.recovery;
  }
  if (metrics.resting_hr != null && baselines.resting_hr != null) {
    const elevation = metrics.resting_hr - baselines.resting_hr;
    if (elevation <= 0) return PILLAR_CAPS.recovery;
    return Math.max(0, 1 - elevation / 10) * PILLAR_CAPS.recovery;
  }
  // No recovery signal yet (first days before a baseline exists): neutral credit
  // so early days aren't unfairly punished.
  return PILLAR_CAPS.recovery * 0.75;
}

// Active calories are NOT a pillar (they'd triple-reward the same walk).
// Small flex bonus only: exceeding ~110% of a rough expected burn earns up to +3.
export function calorieBonus(metrics: DailyMetrics, baselines: Baselines): number {
  const calories = metrics.active_calories;
  const expected = baselines.steps ? baselines.steps * 0.04 : null; // ~0.04 kcal/step heuristic
  if (calories == null || expected == null || expected <= 0) return 0;
  const over = calories / expected - 1.1;
  if (over <= 0) return 0;
  return Math.min(over * 10, CALORIE_BONUS_CAP);
}

export interface ScoreInput {
  metrics: DailyMetrics;
  sessions: WorkoutSession[];
  targets: Targets;
  baselines: Baselines;
  isRestDay: boolean;
}

export function computeDailyScore(input: ScoreInput): PillarPoints {
  const { metrics, sessions, targets, baselines, isRestDay } = input;
  const sleep_pts = round1(sleepPoints(metrics, targets));
  const steps_pts = round1(stepsPoints(metrics, targets));
  const recovery_pts = round1(recoveryPoints(metrics, baselines));
  const bonus = round1(calorieBonus(metrics, baselines));

  if (isRestDay) {
    // Rest-day rule: drop the exercise pillar and renormalize over the
    // remaining 65 points, so a good rest day can still score ~90–100.
    const total = Math.round(
      Math.min(((sleep_pts + steps_pts + recovery_pts) / 65) * 100 + bonus, 100),
    );
    return { sleep_pts, steps_pts, exercise_pts: 0, recovery_pts, calorie_bonus: bonus, total, is_rest_day: true };
  }

  const exercise_pts = round1(exercisePoints(sessions, targets));
  const total = Math.round(
    Math.min(sleep_pts + steps_pts + exercise_pts + recovery_pts + bonus, 100),
  );
  return { sleep_pts, steps_pts, exercise_pts, recovery_pts, calorie_bonus: bonus, total, is_rest_day: false };
}

// The recovery duel compares sleep + recovery so the cardio grinder can't own everything.
export function recoveryDuelScore(p: PillarPoints): number {
  return round1(p.sleep_pts + p.recovery_pts);
}

export interface PillarGap {
  pillar: "sleep" | "steps" | "exercise" | "recovery";
  earned: number;
  cap: number;
  gap: number;
}

// Weakest pillar of the day — drives the mid-day behavioral nudges.
export function weakestPillar(p: PillarPoints): PillarGap {
  const gaps: PillarGap[] = [
    { pillar: "sleep", earned: p.sleep_pts, cap: PILLAR_CAPS.sleep, gap: 0 },
    { pillar: "steps", earned: p.steps_pts, cap: PILLAR_CAPS.steps, gap: 0 },
    { pillar: "exercise", earned: p.exercise_pts, cap: PILLAR_CAPS.exercise, gap: 0 },
    { pillar: "recovery", earned: p.recovery_pts, cap: PILLAR_CAPS.recovery, gap: 0 },
  ];
  for (const g of gaps) g.gap = round1(g.cap - g.earned);
  // Sleep/recovery can't be acted on mid-day; prefer actionable pillars when
  // their gap is meaningful.
  const actionable = gaps.filter((g) => g.pillar === "steps" || g.pillar === "exercise");
  const best = [...actionable, ...gaps].sort((a, b) => b.gap - a.gap);
  const actionableBest = actionable.sort((a, b) => b.gap - a.gap)[0];
  return actionableBest.gap >= 5 ? actionableBest : best[0];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
