import type { Exercise } from "./types";

const ex = (id: string, name: string, muscleGroup: Exercise["muscleGroup"], equipment: Exercise["equipment"]): Exercise => ({
  id,
  name,
  muscleGroup,
  equipment,
});

export const BUILT_IN_EXERCISES: Exercise[] = [
  // chest
  ex("bench-press", "Bench Press", "chest", "barbell"),
  ex("incline-db-press", "Incline DB Press", "chest", "dumbbell"),
  ex("db-bench-press", "DB Bench Press", "chest", "dumbbell"),
  ex("cable-fly", "Cable Fly", "chest", "cable"),
  ex("machine-chest-press", "Machine Chest Press", "chest", "machine"),
  ex("push-up", "Push-Up", "chest", "bodyweight"),
  ex("dips", "Dips", "chest", "bodyweight"),
  // back
  ex("deadlift", "Deadlift", "back", "barbell"),
  ex("barbell-row", "Barbell Row", "back", "barbell"),
  ex("lat-pulldown", "Lat Pulldown", "back", "cable"),
  ex("seated-cable-row", "Seated Cable Row", "back", "cable"),
  ex("pull-up", "Pull-Up", "back", "bodyweight"),
  ex("db-row", "DB Row", "back", "dumbbell"),
  ex("machine-row", "Machine Row", "back", "machine"),
  // legs
  ex("squat", "Squat", "legs", "barbell"),
  ex("romanian-deadlift", "Romanian Deadlift", "legs", "barbell"),
  ex("leg-press", "Leg Press", "legs", "machine"),
  ex("leg-extension", "Leg Extension", "legs", "machine"),
  ex("leg-curl", "Leg Curl", "legs", "machine"),
  ex("walking-lunge", "Walking Lunge", "legs", "dumbbell"),
  ex("goblet-squat", "Goblet Squat", "legs", "dumbbell"),
  ex("calf-raise", "Calf Raise", "legs", "machine"),
  ex("hip-thrust", "Hip Thrust", "legs", "barbell"),
  // shoulders
  ex("ohp", "OHP", "shoulders", "barbell"),
  ex("db-shoulder-press", "DB Shoulder Press", "shoulders", "dumbbell"),
  ex("lateral-raise", "Lateral Raise", "shoulders", "dumbbell"),
  ex("rear-delt-fly", "Rear Delt Fly", "shoulders", "cable"),
  ex("face-pull", "Face Pull", "shoulders", "cable"),
  // arms
  ex("barbell-curl", "Barbell Curl", "arms", "barbell"),
  ex("db-curl", "DB Curl", "arms", "dumbbell"),
  ex("hammer-curl", "Hammer Curl", "arms", "dumbbell"),
  ex("triceps-pushdown", "Triceps Pushdown", "arms", "cable"),
  ex("overhead-triceps-ext", "Overhead Triceps Extension", "arms", "cable"),
  ex("skull-crusher", "Skull Crusher", "arms", "barbell"),
  // core
  ex("plank", "Plank", "core", "bodyweight"),
  ex("hanging-leg-raise", "Hanging Leg Raise", "core", "bodyweight"),
  ex("cable-crunch", "Cable Crunch", "core", "cable"),
  ex("ab-wheel", "Ab Wheel", "core", "bodyweight"),
];

export const MUSCLE_GROUPS: Exercise["muscleGroup"][] = ["chest", "back", "legs", "shoulders", "arms", "core"];
export const EQUIPMENT: Exercise["equipment"][] = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];
