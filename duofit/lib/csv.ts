import type { AppData, UserId } from "./types";
import { workoutVolume } from "./derive";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rows(lines: unknown[][]): string {
  return lines.map((l) => l.map(esc).join(",")).join("\n");
}

/** Full personal export: one CSV with a section per record type. */
export function exportCSV(data: AppData, userId: UserId): string {
  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;
  const parts: string[] = [];

  parts.push("# WEIGHTS");
  parts.push(
    rows([
      ["date", "weight_kg", "time_of_day"],
      ...data.weights.filter((w) => w.userId === userId).map((w) => [w.date, w.weightKg, w.timeOfDay ?? ""]),
    ])
  );

  parts.push("\n# MEASUREMENTS");
  parts.push(
    rows([
      ["date", "neck", "chest", "waist", "hips", "arm_l", "arm_r", "thighs", "bf_percent"],
      ...data.measurements
        .filter((m) => m.userId === userId)
        .map((m) => [m.date, m.neck, m.chest, m.waist, m.hips, m.armL, m.armR, m.thighs, m.bfPercent]),
    ])
  );

  parts.push("\n# WORKOUT SETS");
  const setLines: unknown[][] = [["date", "workout", "exercise", "set_no", "reps", "weight_kg", "warmup", "failure"]];
  for (const w of data.workouts.filter((w) => w.userId === userId))
    for (const ex of w.exercises)
      ex.sets.forEach((s, i) =>
        setLines.push([w.date, w.name, exName(ex.exerciseId), i + 1, s.reps, s.weightKg, s.isWarmup ? 1 : "", s.isFailure ? 1 : ""])
      );
  parts.push(rows(setLines));

  parts.push("\n# WORKOUT SESSIONS");
  parts.push(
    rows([
      ["date", "name", "total_volume_kg", "notes"],
      ...data.workouts.filter((w) => w.userId === userId).map((w) => [w.date, w.name, workoutVolume(w), w.notes ?? ""]),
    ])
  );

  parts.push("\n# ACTIVITIES");
  parts.push(
    rows([
      ["date", "type", "duration_min", "distance_km", "note"],
      ...data.activities
        .filter((a) => a.userId === userId)
        .map((a) => [a.date, a.type, a.durationMin, a.distanceKm ?? "", a.note ?? ""]),
    ])
  );

  parts.push("\n# DIET ADHERENCE");
  parts.push(
    rows([
      ["date", "status", "note"],
      ...data.adherence.filter((a) => a.userId === userId).map((a) => [a.date, a.status, a.note ?? ""]),
    ])
  );

  return parts.join("\n") + "\n";
}
