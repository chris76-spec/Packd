import assert from "node:assert/strict";
import { test } from "node:test";
import { computeDailyScore, recoveryDuelScore, weakestPillar, DEFAULT_TARGETS } from "../lib/score";
import type { Baselines, DailyMetrics, WorkoutSession } from "../lib/types";

const targets = { ...DEFAULT_TARGETS };
const baselines: Baselines = { steps: 8000, sleep_minutes: 450, resting_hr: 60, hrv: undefined };

function metrics(overrides: Partial<DailyMetrics>): DailyMetrics {
  return {
    user_id: "u1",
    date: "2026-08-05",
    steps: null,
    sleep_minutes: null,
    sleep_stages_json: null,
    resting_hr: null,
    hrv: null,
    active_calories: null,
    ...overrides,
  };
}

function gym(minutes: number): WorkoutSession {
  return { user_id: "u1", date: "2026-08-05", type: "gym", duration_min: minutes, auto_detected: false };
}

test("perfect day scores 100", () => {
  const s = computeDailyScore({
    metrics: metrics({ steps: 8000, sleep_minutes: 450, resting_hr: 58 }),
    sessions: [gym(60)],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.equal(s.total, 100);
});

test("pillars are capped: overshooting one pillar cannot exceed its cap", () => {
  const s = computeDailyScore({
    metrics: metrics({ steps: 30000 }), // nearly 4x target
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.equal(s.steps_pts, 20);
});

test("hard leg day beats a mindless 12k-step day (PRD design principle)", () => {
  const legDay = computeDailyScore({
    metrics: metrics({ steps: 4000, sleep_minutes: 450, resting_hr: 60 }),
    sessions: [gym(75)],
    targets,
    baselines,
    isRestDay: false,
  });
  const stepDay = computeDailyScore({
    metrics: metrics({ steps: 12000, sleep_minutes: 450, resting_hr: 60 }),
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.ok(legDay.total > stepDay.total, `${legDay.total} should beat ${stepDay.total}`);
});

test("rest day renormalizes over 65: a good rest day scores ~90-100", () => {
  const s = computeDailyScore({
    metrics: metrics({ steps: 7000, sleep_minutes: 480, resting_hr: 57 }),
    sessions: [],
    targets,
    baselines,
    isRestDay: true,
  });
  assert.equal(s.exercise_pts, 0);
  assert.ok(s.total >= 90, `rest day scored ${s.total}, expected >= 90`);
});

test("sleep stages add quality points; duration-only fallback still works", () => {
  const withStages = computeDailyScore({
    metrics: metrics({
      sleep_minutes: 450,
      sleep_stages_json: { deep_minutes: 90, rem_minutes: 100, light_minutes: 260 },
    }),
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  const withoutStages = computeDailyScore({
    metrics: metrics({ sleep_minutes: 450 }),
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.equal(withStages.sleep_pts, 25); // 18 duration + 7 quality (42% deep+REM)
  assert.equal(withoutStages.sleep_pts, 25); // duration-only path uses full cap
});

test("poor sleep quality with stages scores below duration-only", () => {
  const s = computeDailyScore({
    metrics: metrics({
      sleep_minutes: 450,
      sleep_stages_json: { deep_minutes: 20, rem_minutes: 25, light_minutes: 405 },
    }),
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.ok(s.sleep_pts < 25 && s.sleep_pts >= 18, `got ${s.sleep_pts}`);
});

test("elevated resting HR scales recovery down; HRV used when available", () => {
  const elevated = computeDailyScore({
    metrics: metrics({ resting_hr: 65 }), // +5 over baseline 60
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.equal(elevated.recovery_pts, 10); // 50% of 20

  const hrvDay = computeDailyScore({
    metrics: metrics({ hrv: 45, resting_hr: 65 }),
    sessions: [],
    targets,
    baselines: { ...baselines, hrv: 50 },
    isRestDay: false,
  });
  assert.equal(hrvDay.recovery_pts, 18); // 45/50 * 20 — HRV wins over RHR
});

test("recovery duel score = sleep + recovery pillars", () => {
  const s = computeDailyScore({
    metrics: metrics({ sleep_minutes: 450, resting_hr: 58, steps: 8000 }),
    sessions: [gym(60)],
    targets,
    baselines,
    isRestDay: false,
  });
  assert.equal(recoveryDuelScore(s), 45);
});

test("weakest pillar prefers actionable pillars (steps/exercise) mid-day", () => {
  const s = computeDailyScore({
    metrics: metrics({ sleep_minutes: 200, steps: 7500, resting_hr: 70 }),
    sessions: [],
    targets,
    baselines,
    isRestDay: false,
  });
  // Sleep and recovery are worse in absolute gap, but you can't fix them at 1pm.
  assert.equal(weakestPillar(s).pillar, "exercise");
});

test("no-data day scores low but recovery gets neutral credit pre-baseline", () => {
  const s = computeDailyScore({
    metrics: metrics({}),
    sessions: [],
    targets,
    baselines: {},
    isRestDay: false,
  });
  assert.equal(s.sleep_pts + s.steps_pts + s.exercise_pts, 0);
  assert.equal(s.recovery_pts, 15); // neutral 75% until a baseline exists
});
