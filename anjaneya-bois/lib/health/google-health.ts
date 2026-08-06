// Google Health API client (the successor to the legacy Fitbit Web API, which
// is decommissioned September 2026 — do NOT call fitbit.com endpoints).
//
// Auth:  standard Google OAuth 2.0 (accounts.google.com), refresh-token flow.
// Data:  https://health.googleapis.com/v4/users/me/dataTypes/{type}/dataPoints:dailyRollUp
//        aggregates data points over civil-time (calendar-day) windows, which is
//        exactly what the daily score needs.
//
// The Fitbit Air is an entry band: sleep stages and HRV may be absent. Every
// fetch here degrades to null and the scoring engine has fallbacks (PRD §3/§4).

import type { DailyMetrics, SleepStages } from "../types";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const HEALTH_API_BASE = "https://health.googleapis.com/v4";

// Read-only scopes for the data bundles the score needs. Verify the exact
// scope strings against your Google Cloud Console OAuth consent screen —
// see https://developers.google.com/health/scopes
export const HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
].join(" ");

// Data type names per the Google Health API data-type catalog
// (https://developers.google.com/health — Activity & Fitness, Health Metrics).
// Centralized so a rename is a one-line fix.
export const DATA_TYPES = {
  steps: "steps",
  sleep: "sleep",
  restingHeartRate: "daily_resting_heart_rate",
  hrv: "daily_heart_rate_variability",
  activeCalories: "active_zone_minutes_calories",
  totalCalories: "total_calories",
} as const;

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: HEALTH_SCOPES,
    access_type: "offline", // we need a refresh token for the 04:00 server sync
    prompt: "consent",      // force refresh_token issuance on re-connect
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  scopes: string;
}

export async function exchangeCode(code: string): Promise<TokenSet> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scopes: data.scope ?? HEALTH_SCOPES,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<Omit<TokenSet, "refresh_token" | "scopes">> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
}

// ── Data fetch ──────────────────────────────────────────────────────────────

async function dailyRollUp(
  accessToken: string,
  dataType: string,
  date: string,
  timeZone: string,
): Promise<Record<string, unknown> | null> {
  const url = `${HEALTH_API_BASE}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ startDate: date, endDate: date, timeZone }),
  });
  if (res.status === 404 || res.status === 403) {
    // Data type not available for this device (e.g. the Air lacks HRV) —
    // degrade gracefully; the score engine has fallbacks.
    return null;
  }
  if (!res.ok) {
    throw new Error(`Health API ${dataType} rollUp failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  const points = body.dataPoints ?? body.data_points ?? [];
  return points[0] ?? null;
}

function num(point: Record<string, unknown> | null, ...keys: string[]): number | null {
  if (!point) return null;
  for (const key of keys) {
    const v = pluck(point, key);
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function pluck(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function parseSleepStages(point: Record<string, unknown> | null): SleepStages | null {
  if (!point) return null;
  const stages = (pluck(point, "value.stages") ?? pluck(point, "stages")) as
    | Array<{ stage?: string; type?: string; minutes?: number; durationMinutes?: number }>
    | undefined;
  if (!Array.isArray(stages) || stages.length === 0) return null;
  const byStage = (name: string) =>
    stages
      .filter((s) => (s.stage ?? s.type ?? "").toUpperCase().includes(name))
      .reduce((sum, s) => sum + (s.minutes ?? s.durationMinutes ?? 0), 0);
  const deep = byStage("DEEP");
  const rem = byStage("REM");
  const light = byStage("LIGHT");
  if (deep + rem + light === 0) return null;
  return { deep_minutes: deep, rem_minutes: rem, light_minutes: light, awake_minutes: byStage("AWAKE") };
}

/**
 * Pull one calendar day of metrics for a user. Missing data types resolve to
 * null fields — the caller decides what that means for scoring.
 */
export async function fetchDailyMetrics(
  accessToken: string,
  userId: string,
  date: string,
  timeZone: string,
): Promise<DailyMetrics> {
  const [steps, sleep, rhr, hrv, activeCal] = await Promise.all([
    dailyRollUp(accessToken, DATA_TYPES.steps, date, timeZone),
    dailyRollUp(accessToken, DATA_TYPES.sleep, date, timeZone),
    dailyRollUp(accessToken, DATA_TYPES.restingHeartRate, date, timeZone),
    dailyRollUp(accessToken, DATA_TYPES.hrv, date, timeZone),
    dailyRollUp(accessToken, DATA_TYPES.activeCalories, date, timeZone),
  ]);

  return {
    user_id: userId,
    date,
    steps: num(steps, "value.intVal", "value.count", "value", "count"),
    sleep_minutes: num(sleep, "value.totalSleepMinutes", "value.minutesAsleep", "value.durationMinutes", "durationMinutes"),
    sleep_stages_json: parseSleepStages(sleep),
    resting_hr: num(rhr, "value.bpm", "value.fpVal", "value", "bpm"),
    hrv: num(hrv, "value.rmssd", "value.dailyRmssd", "value.fpVal", "value"),
    active_calories: num(activeCal, "value.calories", "value.fpVal", "value", "calories"),
    source_synced_at: new Date().toISOString(),
  };
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}
