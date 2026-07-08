import type {
  AppData,
  AdherenceLog,
  Activity,
  MeasurementEntry,
  Profile,
  WeightEntry,
  Workout,
  WorkoutExercise,
} from "./types";
import { BUILT_IN_EXERCISES } from "./exercises";
import { navyBodyFat } from "./bf";
import { addDays, startOfWeek, todayISO, uid } from "./format";

export const CHRISTOPHER: Profile = {
  id: "christopher",
  name: "Christopher",
  sex: "male",
  heightCm: 175,
  tint: "#e8763f",
  series: "#d96a35",
};

export const MAHAK: Profile = {
  id: "mahak",
  name: "Mahak",
  sex: "female",
  heightCm: 160,
  tint: "#96bb98",
  series: "#63a56d",
};

const wx = (exerciseId: string, count: number, reps: number, weightKg: number): WorkoutExercise => ({
  exerciseId,
  sets: Array.from({ length: count }, () => ({ reps, weightKg })),
});

/** Build 8 weeks of demo data anchored to today, so the app is alive on first open. */
export function buildSeed(): AppData {
  const today = todayISO();
  const d = (offset: number) => addDays(today, -offset);

  // ---- weights: weekly trend, last entry yesterday morning
  const cWeights = [93.2, 92.8, 92.5, 92.0, 91.6, 91.3, 90.9, 90.6];
  const mWeights = [65.8, 65.5, 65.2, 64.9, 64.6, 64.2, 64.0, 63.7];
  const weights: WeightEntry[] = [];
  cWeights.forEach((w, i) =>
    weights.push({ id: uid(), userId: "christopher", date: d(1 + (7 - i) * 7), weightKg: w, timeOfDay: "morning" })
  );
  mWeights.forEach((w, i) =>
    weights.push({ id: uid(), userId: "mahak", date: d(1 + (7 - i) * 7), weightKg: w, timeOfDay: "morning" })
  );

  // ---- measurements: weekly, BF% auto-computed on write
  const measurements: MeasurementEntry[] = [];
  const cM = {
    neck: [40, 40, 39.5, 39.5, 39, 39, 39, 39],
    chest: [103, 103, 103.5, 103.5, 104, 104, 104, 104],
    waist: [91, 90.5, 90, 89.5, 89, 88.5, 88.5, 88],
    hips: [99, 98.5, 98.5, 98, 98, 97.5, 97, 97],
    armL: [37, 37, 37.5, 37.5, 37.5, 38, 38, 38],
    armR: [37.5, 37.5, 38, 38, 38, 38.5, 38.5, 38.5],
    thighs: [59, 59, 58.5, 58.5, 58.5, 58, 58, 58],
  };
  const mM = {
    neck: [33, 33, 32.5, 32.5, 32.5, 32, 32, 32],
    chest: [88, 88, 87.5, 87.5, 87.5, 87, 87, 87],
    waist: [72, 71.5, 71, 70.5, 70.5, 70, 70, 69.5],
    hips: [98, 97.5, 97.5, 97, 97, 96.5, 96, 96],
    armL: [27, 27, 27, 27.5, 27.5, 27.5, 27.5, 27.5],
    armR: [27, 27, 27.5, 27.5, 27.5, 27.5, 28, 28],
    thighs: [54, 54, 53.5, 53.5, 53.5, 53, 53, 53],
  };
  for (let i = 0; i < 8; i++) {
    const when = d((7 - i) * 7);
    measurements.push({
      id: uid(),
      userId: "christopher",
      date: when,
      neck: cM.neck[i],
      chest: cM.chest[i],
      waist: cM.waist[i],
      hips: cM.hips[i],
      armL: cM.armL[i],
      armR: cM.armR[i],
      thighs: cM.thighs[i],
      bfPercent: navyBodyFat("male", CHRISTOPHER.heightCm, cM.neck[i], cM.waist[i], cM.hips[i]),
    });
    measurements.push({
      id: uid(),
      userId: "mahak",
      date: when,
      neck: mM.neck[i],
      chest: mM.chest[i],
      waist: mM.waist[i],
      hips: mM.hips[i],
      armL: mM.armL[i],
      armR: mM.armR[i],
      thighs: mM.thighs[i],
      bfPercent: navyBodyFat("female", MAHAK.heightCm, mM.neck[i], mM.waist[i], mM.hips[i]),
    });
  }

  // ---- workouts
  const workouts: Workout[] = [];
  const bench = [80, 82.5, 82.5, 85, 87.5, 87.5, 90, 92.5];
  const ohp = [50, 52.5, 52.5, 55, 55, 57.5, 57.5, 60];
  const incline = [24, 24, 26, 26, 28, 28, 30, 30];
  const dead = [120, 125, 130, 132.5, 135, 140, 142.5, 145];
  const row = [60, 62.5, 62.5, 65, 65, 67.5, 70, 70];
  const squat = [100, 105, 107.5, 110, 112.5, 115, 117.5, 120];

  for (let w = 0; w < 8; w++) {
    const back = (7 - w) * 7; // weeks ago
    // Christopher — Push A (today when w=7), Pull A (−2d), Legs A (−4d), Push B on odd weeks (−5d)
    workouts.push({
      id: w === 7 ? "c-push-a-now" : uid(),
      userId: "christopher",
      date: d(back),
      time: "16:30",
      name: "Push A",
      exercises: [
        wx("bench-press", 4, 8, bench[w]),
        wx("ohp", 4, 10, ohp[w]),
        wx("incline-db-press", 3, 12, incline[w]),
        wx("cable-fly", 3, 15, 20),
        wx("triceps-pushdown", 3, 12, 30),
      ],
    });
    workouts.push({
      id: w === 7 ? "c-pull-a-now" : uid(),
      userId: "christopher",
      date: d(back + 2),
      time: "16:45",
      name: "Pull A",
      exercises: [
        wx("deadlift", 4, 6, dead[w]),
        wx("barbell-row", 4, 10, row[w]),
        wx("lat-pulldown", 3, 12, 65),
        wx("seated-cable-row", 3, 12, 60),
        wx("db-curl", 3, 12, 12),
      ],
    });
    workouts.push({
      id: uid(),
      userId: "christopher",
      date: d(back + 4),
      time: "17:00",
      name: "Legs A",
      exercises: [
        wx("squat", 4, 6, squat[w]),
        wx("romanian-deadlift", 3, 10, 90),
        wx("leg-press", 3, 12, 160),
        wx("leg-curl", 3, 12, 45),
        wx("calf-raise", 4, 15, 60),
      ],
    });
    if (w % 2 === 1) {
      workouts.push({
        id: uid(),
        userId: "christopher",
        date: d(back + 5),
        time: "16:30",
        name: "Push B",
        exercises: [
          wx("db-bench-press", 4, 10, 32),
          wx("db-shoulder-press", 3, 10, 22),
          wx("dips", 3, 12, 0),
          wx("lateral-raise", 3, 15, 10),
        ],
      });
    }
    // Mahak — Upper (−1d), Lower (−3d), Full Body on 6 of 8 weeks (−6d)
    workouts.push({
      id: uid(),
      userId: "mahak",
      date: d(back + 1),
      time: "10:30",
      name: "Upper",
      exercises: [
        wx("db-bench-press", 3, 10, 14 + w * 0.5),
        wx("lat-pulldown", 3, 12, 35 + w),
        wx("db-shoulder-press", 3, 12, 8),
        wx("db-curl", 3, 12, 7),
      ],
    });
    workouts.push({
      id: uid(),
      userId: "mahak",
      date: d(back + 3),
      time: "10:30",
      name: "Lower",
      exercises: [
        wx("goblet-squat", 4, 10, 16 + w),
        wx("hip-thrust", 4, 10, 50 + w * 2.5),
        wx("leg-curl", 3, 12, 30),
        wx("calf-raise", 3, 15, 40),
      ],
    });
    if (w > 1) {
      workouts.push({
        id: uid(),
        userId: "mahak",
        date: d(back + 6),
        time: "11:00",
        name: "Full Body",
        exercises: [
          wx("goblet-squat", 3, 12, 14 + w),
          wx("push-up", 3, 12, 0),
          wx("machine-row", 3, 12, 30),
          wx("plank", 3, 1, 0),
        ],
      });
    }
  }

  // ---- activities
  const activities: Activity[] = [
    { id: uid(), userId: "christopher", date: d(3), type: "badminton", durationMin: 60, note: "Doubles with Mahak" },
    { id: uid(), userId: "mahak", date: d(3), type: "badminton", durationMin: 60 },
    { id: uid(), userId: "mahak", date: d(2), type: "walk", durationMin: 40, distanceKm: 3.5 },
    { id: uid(), userId: "christopher", date: d(10), type: "badminton", durationMin: 75 },
    { id: uid(), userId: "mahak", date: d(9), type: "run", durationMin: 25, distanceKm: 4 },
  ];

  // ---- adherence: this week explicit, older weeks patterned (~80%+)
  const adherence: AdherenceLog[] = [];
  const seedDay = (userId: "christopher" | "mahak", offset: number, status: AdherenceLog["status"]) =>
    adherence.push({ id: uid(), userId, date: d(offset), status });
  for (const u of ["christopher", "mahak"] as const) {
    // last 6 full days: one "no", the rest yes; today unlogged (that's the prompt)
    for (let o = 1; o <= 6; o++) seedDay(u, o, o === (u === "christopher" ? 4 : 5) ? "no" : "yes");
    for (let o = 7; o <= 55; o++) {
      const r = (o * 7 + (u === "christopher" ? 3 : 5)) % 13;
      if (r === 1) continue; // skipped day
      seedDay(u, o, r === 4 ? "no" : r === 8 || r === 11 ? "partial" : "yes");
    }
  }

  // ---- programs
  const sharedStart = addDays(startOfWeek(today), -49); // week 8 of 12
  const programs = [
    { id: "prog-shared", scope: "shared" as const, name: "Shared Couple Block", startDate: sharedStart, weeks: 12 },
    {
      id: "prog-c",
      scope: "individual" as const,
      userId: "christopher" as const,
      name: "Recomp Block",
      startDate: sharedStart,
      weeks: 12,
    },
    {
      id: "prog-m",
      scope: "individual" as const,
      userId: "mahak" as const,
      name: "Strength Base",
      startDate: addDays(sharedStart, 14),
      weeks: 12,
    },
  ];

  return {
    version: 1,
    currentUserId: "christopher",
    profiles: [CHRISTOPHER, MAHAK],
    weights,
    measurements,
    exercises: BUILT_IN_EXERCISES,
    workouts,
    activities,
    adherence,
    photos: [],
    comments: [
      {
        id: uid(),
        authorId: "mahak",
        targetType: "workout",
        targetId: "c-push-a-now",
        body: "Beast mode today! Those numbers are climbing 🔥",
        createdAt: new Date().toISOString(),
      },
      {
        id: uid(),
        authorId: "mahak",
        targetType: "workout",
        targetId: "c-pull-a-now",
        body: "That deadlift is getting serious 👀",
        createdAt: new Date().toISOString(),
      },
    ],
    nudges: [],
    programs,
  };
}
