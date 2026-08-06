// Rolling personal baselines over the trailing 21 days (PRD: 14–28), seeded
// with sensible defaults until ~2 weeks of real data exist.

import { DEFAULT_TARGETS } from "./score";
import type { Baselines, DailyMetrics } from "./types";

export const BASELINE_WINDOW_DAYS = 21;
export const MIN_SAMPLES = 7; // below this, keep the seed for that metric

export function computeBaselines(history: DailyMetrics[]): Baselines {
  const steps = values(history, (m) => m.steps);
  const sleep = values(history, (m) => m.sleep_minutes);
  const rhr = values(history, (m) => m.resting_hr);
  const hrv = values(history, (m) => m.hrv);

  return {
    steps: steps.length >= MIN_SAMPLES ? Math.round(mean(steps)) : DEFAULT_TARGETS.steps,
    sleep_minutes:
      sleep.length >= MIN_SAMPLES ? Math.round(mean(sleep)) : DEFAULT_TARGETS.sleep_minutes,
    resting_hr: rhr.length >= MIN_SAMPLES ? round1(mean(rhr)) : undefined,
    hrv: hrv.length >= MIN_SAMPLES ? round1(mean(hrv)) : undefined,
    computed_at: new Date().toISOString(),
  };
}

function values(history: DailyMetrics[], pick: (m: DailyMetrics) => number | null): number[] {
  return history.map(pick).filter((v): v is number => v != null && v > 0);
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
