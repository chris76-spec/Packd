export type UserId = "christopher" | "mahak";

export interface Profile {
  id: UserId;
  name: string;
  sex: "male" | "female";
  heightCm: number;
  /** UI accent tint */
  tint: string;
  /** validated chart series color */
  series: string;
}

export interface WeightEntry {
  id: string;
  userId: UserId;
  date: string; // yyyy-mm-dd
  weightKg: number;
  timeOfDay?: "morning" | "afternoon" | "evening";
}

export interface MeasurementEntry {
  id: string;
  userId: UserId;
  date: string;
  neck: number;
  chest: number;
  waist: number;
  hips: number;
  armL: number;
  armR: number;
  thighs: number;
  /** auto-computed US Navy BF% — stored on write */
  bfPercent: number;
}

export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";
export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isCustom?: boolean;
}

export interface SetEntry {
  reps: number;
  weightKg: number;
  isWarmup?: boolean;
  isFailure?: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  userId: UserId;
  date: string;
  time?: string; // "16:30"
  name: string;
  notes?: string;
  exercises: WorkoutExercise[];
}

export type ActivityType = "badminton" | "walk" | "run" | "cardio" | "other";

export interface Activity {
  id: string;
  userId: UserId;
  date: string;
  type: ActivityType;
  durationMin: number;
  distanceKm?: number;
  note?: string;
}

export type AdherenceStatus = "yes" | "partial" | "no";

export interface AdherenceLog {
  id: string;
  userId: UserId;
  date: string;
  status: AdherenceStatus;
  note?: string;
}

export interface PhotoEntry {
  id: string;
  userId: UserId;
  date: string;
  angle: "front" | "side" | "back";
  dataUrl: string;
  isPrivate?: boolean;
}

export interface Comment {
  id: string;
  authorId: UserId;
  targetType: "workout" | "weight" | "measurement" | "photo" | "activity";
  targetId: string;
  body: string;
  createdAt: string;
}

export interface Nudge {
  id: string;
  fromUser: UserId;
  toUser: UserId;
  createdAt: string;
}

export interface Program {
  id: string;
  scope: "shared" | "individual";
  userId?: UserId;
  name: string;
  startDate: string;
  weeks: number;
}

export interface AppData {
  version: number;
  currentUserId: UserId;
  profiles: Profile[];
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  exercises: Exercise[];
  workouts: Workout[];
  activities: Activity[];
  adherence: AdherenceLog[];
  photos: PhotoEntry[];
  comments: Comment[];
  nudges: Nudge[];
  programs: Program[];
}
