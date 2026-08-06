// Date helpers, all in the app timezone (both users live together, PRD §2).

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

/** Today's date (YYYY-MM-DD) in the app timezone. */
export function localToday(now: Date = new Date()): string {
  return toDateString(now);
}

/** Yesterday relative to now, in the app timezone. */
export function localYesterday(now: Date = new Date()): string {
  return addDays(localToday(now), -1);
}

export function toDateString(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function isSunday(date: string): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
}

/** First day of the month containing `date` (season boundary; PRD §5). */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** All dates from `from` to `to` inclusive. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
