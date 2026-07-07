import type { AppData, AdherenceStatus, UserId, Workout } from "./types";
import { est1RM } from "./bf";
import { addDays, startOfWeek, todayISO } from "./format";

export function setVolume(reps: number, weightKg: number): number {
  return reps * weightKg;
}

/** Total tonnage of a session, warm-ups excluded. */
export function workoutVolume(w: Workout): number {
  let v = 0;
  for (const ex of w.exercises)
    for (const s of ex.sets) if (!s.isWarmup) v += setVolume(s.reps, s.weightKg);
  return Math.round(v);
}

export function userWeights(data: AppData, userId: UserId) {
  return data.weights.filter((w) => w.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
}

export function userMeasurements(data: AppData, userId: UserId) {
  return data.measurements.filter((m) => m.userId === userId).sort((a, b) => a.date.localeCompare(b.date));
}

export function userWorkouts(data: AppData, userId: UserId) {
  return data.workouts.filter((w) => w.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
}

/** Sessions (strength + activities) in the trailing 7 days. */
export function sessionsThisWeek(data: AppData, userId: UserId): number {
  const cutoff = addDays(todayISO(), -6);
  return (
    data.workouts.filter((w) => w.userId === userId && w.date >= cutoff).length +
    data.activities.filter((a) => a.userId === userId && a.date >= cutoff).length
  );
}

export function totalSessions(data: AppData, userId: UserId): number {
  return (
    data.workouts.filter((w) => w.userId === userId).length +
    data.activities.filter((a) => a.userId === userId).length
  );
}

const ADHERENCE_SCORE: Record<AdherenceStatus, number> = { yes: 1, partial: 0.5, no: 0 };

/** Rolling adherence % over the trailing `days` logged days. */
export function adherencePct(data: AppData, userId: UserId, days: number): number {
  const cutoff = addDays(todayISO(), -(days - 1));
  const logs = data.adherence.filter((a) => a.userId === userId && a.date >= cutoff);
  if (!logs.length) return 0;
  const sum = logs.reduce((acc, l) => acc + ADHERENCE_SCORE[l.status], 0);
  return Math.round((sum / logs.length) * 100);
}

/** Trailing 7 days (oldest→today) → { date, status } per day. */
export function dietWeek(data: AppData, userId: UserId): { date: string; status?: AdherenceStatus }[] {
  const today = todayISO();
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, status: data.adherence.find((a) => a.userId === userId && a.date === date)?.status };
  });
}

/** Weekly averages of a dated series over the last `weeks` weeks → [{week, value}] */
export function weeklySeries(
  entries: { date: string; value: number }[],
  weeks: number
): (number | null)[] {
  const monday = startOfWeek(todayISO());
  const out: (number | null)[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDays(monday, -7 * w);
    const end = addDays(start, 6);
    const inWeek = entries.filter((e) => e.date >= start && e.date <= end);
    if (inWeek.length) out.push(inWeek.reduce((a, e) => a + e.value, 0) / inWeek.length);
    else out.push(null);
  }
  // forward-fill gaps so trend lines stay continuous
  let prev: number | null = null;
  return out.map((v) => {
    if (v !== null) prev = v;
    return v ?? prev;
  });
}

/** Top working weight per session for an exercise, oldest→newest. */
export function exerciseProgression(data: AppData, userId: UserId, exerciseId: string) {
  const sessions = data.workouts
    .filter((w) => w.userId === userId && w.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date));
  return sessions.map((w) => {
    const sets = w.exercises.find((e) => e.exerciseId === exerciseId)!.sets.filter((s) => !s.isWarmup);
    return { date: w.date, top: Math.max(0, ...sets.map((s) => s.weightKg)) };
  });
}

export type PRType = "max_weight" | "est_1rm" | "max_volume";

export interface PR {
  userId: UserId;
  exerciseId: string;
  type: PRType;
  value: number;
  date: string;
  workoutId: string;
}

/** Scan all workouts chronologically and derive the PR feed. */
export function derivePRs(data: AppData): PR[] {
  const prs: PR[] = [];
  const best = new Map<string, number>(); // `${user}:${ex}:${type}`
  const sorted = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date));
  for (const w of sorted) {
    for (const ex of w.exercises) {
      let maxW = 0;
      let max1rm = 0;
      let vol = 0;
      for (const s of ex.sets) {
        if (s.isWarmup) continue;
        maxW = Math.max(maxW, s.weightKg);
        max1rm = Math.max(max1rm, est1RM(s.weightKg, s.reps));
        vol += setVolume(s.reps, s.weightKg);
      }
      if (maxW <= 0) continue;
      const checks: [PRType, number][] = [
        ["max_weight", maxW],
        ["est_1rm", max1rm],
        ["max_volume", vol],
      ];
      // one PR entry per exercise per session — report the most meaningful type
      let found: PR | null = null;
      for (const [type, value] of checks) {
        const key = `${w.userId}:${ex.exerciseId}:${type}`;
        const prev = best.get(key) ?? 0;
        if (value > prev) {
          best.set(key, value);
          if (prev > 0 && !found)
            found = { userId: w.userId, exerciseId: ex.exerciseId, type, value, date: w.date, workoutId: w.id };
        }
      }
      if (found) prs.push(found);
    }
  }
  return prs.sort((a, b) => b.date.localeCompare(a.date));
}

/** Exercises the user has logged at least twice, most-used first (for overload chips). */
export function progressionCandidates(data: AppData, userId: UserId): string[] {
  const counts = new Map<string, number>();
  for (const w of data.workouts.filter((w) => w.userId === userId))
    for (const ex of w.exercises) counts.set(ex.exerciseId, (counts.get(ex.exerciseId) ?? 0) + 1);
  const KEY_LIFTS = ["bench-press", "squat", "deadlift", "ohp", "hip-thrust"];
  const rank = (id: string) => {
    const i = KEY_LIFTS.indexOf(id);
    return i === -1 ? KEY_LIFTS.length : i;
  };
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])
    .map(([id]) => id);
}

/** Last time this exercise was performed before `beforeDate` → sets summary for the "previous" column. */
export function previousPerformance(data: AppData, userId: UserId, exerciseId: string, beforeDate: string) {
  const prior = data.workouts
    .filter((w) => w.userId === userId && w.date < beforeDate && w.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prior) return null;
  return {
    date: prior.date,
    sets: prior.exercises.find((e) => e.exerciseId === exerciseId)!.sets,
  };
}
