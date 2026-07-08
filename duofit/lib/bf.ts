/** US Navy Method body-fat %. Measurements in cm. */
export function navyBodyFat(
  sex: "male" | "female",
  heightCm: number,
  neck: number,
  waist: number,
  hips: number
): number {
  const log10 = Math.log10;
  let bf: number;
  if (sex === "male") {
    bf = 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(heightCm)) - 450;
  } else {
    bf = 495 / (1.29579 - 0.35004 * log10(waist + hips - neck) + 0.221 * log10(heightCm)) - 450;
  }
  return Math.round(bf * 10) / 10;
}

/** Epley estimated 1RM */
export function est1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}
