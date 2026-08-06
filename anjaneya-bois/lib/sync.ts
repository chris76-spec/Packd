// The sync pipeline (PRD §3):
//   04:00  settleDay()  — finalize yesterday, lock scores, decide both duels,
//                         update weekly league + shared goal, generate commentary,
//                         and on Sundays build the weekly wrap.
//   13:00 / 19:00  pulse() — pull today's partial data and fire behavioral nudges.

import { computeBaselines, BASELINE_WINDOW_DAYS } from "./baselines";
import { generateDailyCommentary, generateWeeklyCommentary, phraseNudge } from "./claude";
import { addDays, dateRange, isSunday, localToday, localYesterday, weekStart } from "./dates";
import { fetchDailyMetrics, refreshAccessToken } from "./health/google-health";
import { sendPushToUser } from "./push";
import { computeDailyScore, recoveryDuelScore, weakestPillar, DEFAULT_TARGETS } from "./score";
import { db, unwrap } from "./supabase";
import type { DailyMetrics, DailyScore, Matchup, User, WorkoutSession } from "./types";

// Combined weekly score both players feed into (PRD §5 shared goal).
// Both win or both miss. ~65/day/person average keeps it honest but reachable.
const SHARED_GOAL_TARGET = 910;

// ── Shared helpers ──────────────────────────────────────────────────────────

async function loadMatchup(): Promise<{ matchup: Matchup; users: [User, User] }> {
  const matchup = unwrap<Matchup[]>(
    await db().from("matchups").select("*").order("created_at").limit(1),
  )[0];
  if (!matchup) throw new Error("No matchup configured — seed users + matchups first");
  const users = unwrap<User[]>(
    await db().from("users").select("*").in("id", [matchup.user_a, matchup.user_b]),
  );
  const a = users.find((u) => u.id === matchup.user_a)!;
  const b = users.find((u) => u.id === matchup.user_b)!;
  return { matchup, users: [a, b] };
}

async function accessTokenFor(userId: string): Promise<string | null> {
  const { data: token } = await db().from("google_tokens").select("*").eq("user_id", userId).single();
  if (!token) return null;
  if (new Date(token.expires_at).getTime() > Date.now() + 60_000) return token.access_token;
  const refreshed = await refreshAccessToken(token.refresh_token);
  await db()
    .from("google_tokens")
    .update({ ...refreshed, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  return refreshed.access_token;
}

async function pullMetrics(user: User, date: string): Promise<DailyMetrics | null> {
  const token = await accessTokenFor(user.id);
  if (!token) return null;
  const metrics = await fetchDailyMetrics(token, user.id, date, user.timezone);
  await db().from("daily_metrics").upsert(metrics, { onConflict: "user_id,date" });
  return metrics;
}

async function sessionsFor(userId: string, date: string): Promise<WorkoutSession[]> {
  const { data } = await db().from("sessions").select("*").eq("user_id", userId).eq("date", date);
  return (data as WorkoutSession[]) ?? [];
}

async function isRestDay(userId: string, date: string): Promise<boolean> {
  const { data } = await db()
    .from("daily_scores")
    .select("is_rest_day")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  return data?.is_rest_day ?? false;
}

/** Recompute and upsert a user's score for a date; returns the pillar points. */
export async function scoreDay(user: User, date: string, lock: boolean): Promise<DailyScore> {
  const { data: metricsRow } = await db()
    .from("daily_metrics")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", date)
    .single();

  const metrics: DailyMetrics = (metricsRow as DailyMetrics) ?? {
    user_id: user.id,
    date,
    steps: null,
    sleep_minutes: null,
    sleep_stages_json: null,
    resting_hr: null,
    hrv: null,
    active_calories: null,
  };

  const sessions = await sessionsFor(user.id, date);
  const rest = await isRestDay(user.id, date);
  const targets = { ...DEFAULT_TARGETS, ...user.targets_json };
  const points = computeDailyScore({
    metrics,
    sessions,
    targets,
    baselines: user.baselines_json ?? {},
    isRestDay: rest,
  });

  const row: DailyScore = { user_id: user.id, date, ...points, locked: lock };
  await db().from("daily_scores").upsert(row, { onConflict: "user_id,date" });
  return row;
}

// ── 04:00 settle ────────────────────────────────────────────────────────────

export async function settleDay(now: Date = new Date()): Promise<object> {
  const date = localYesterday(now);
  const { matchup, users } = await loadMatchup();
  const [a, b] = users;

  // 1. Final metric pull + refresh rolling baselines.
  for (const user of users) {
    await pullMetrics(user, date).catch((err) =>
      console.error(`metrics pull failed for ${user.name}`, err),
    );
    const { data: history } = await db()
      .from("daily_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", addDays(date, -BASELINE_WINDOW_DAYS))
      .lte("date", date);
    const baselines = computeBaselines((history as DailyMetrics[]) ?? []);
    user.baselines_json = baselines;
    await db().from("users").update({ baselines_json: baselines }).eq("id", user.id);
  }

  // 2. Lock the daily scores.
  const scoreA = await scoreDay(a, date, true);
  const scoreB = await scoreDay(b, date, true);

  // 3. Decide both duels.
  const dailyWinner = pickWinner(scoreA.total, scoreB.total, a.id, b.id);
  const recA = recoveryDuelScore(scoreA);
  const recB = recoveryDuelScore(scoreB);
  const recoveryWinner = pickWinner(recA, recB, a.id, b.id);

  await db().from("duels").upsert(
    [
      { matchup_id: matchup.id, date, type: "daily", user_a_score: scoreA.total, user_b_score: scoreB.total, winner: dailyWinner },
      { matchup_id: matchup.id, date, type: "recovery", user_a_score: recA, user_b_score: recB, winner: recoveryWinner },
    ],
    { onConflict: "matchup_id,date,type" },
  );

  // 4. Weekly league + shared goal.
  const wkStart = weekStart(date);
  const weekDates = dateRange(wkStart, date);
  const { data: weekScores } = await db()
    .from("daily_scores")
    .select("user_id, total")
    .in("user_id", [a.id, b.id])
    .in("date", weekDates);
  const totalA = sum(weekScores ?? [], a.id);
  const totalB = sum(weekScores ?? [], b.id);
  const weekDone = isSunday(date);
  await db().from("weekly").upsert(
    {
      matchup_id: matchup.id,
      week_start: wkStart,
      user_a_total: totalA,
      user_b_total: totalB,
      winner: weekDone ? pickWinner(totalA, totalB, a.id, b.id) : null,
      shared_goal_target: SHARED_GOAL_TARGET,
      shared_goal_progress: totalA + totalB,
      shared_goal_met: weekDone ? totalA + totalB >= SHARED_GOAL_TARGET : null,
    },
    { onConflict: "matchup_id,week_start" },
  );

  // 5. AI commentary off the finalized data.
  const seasonRecord = await seasonRecordString(matchup, a, b, date);
  const lines = await generateDailyCommentary({
    date,
    users: [a, b],
    scores: [scoreA, scoreB],
    dailyWinner,
    recoveryWinner,
    seasonRecord,
    streak: await streakString(matchup, a, b, date),
  });
  if (lines.length > 0) {
    await db()
      .from("commentary")
      .insert(lines.map((l) => ({ matchup_id: matchup.id, scope: "day", date, message: l.message, tone: l.tone })));
  }

  // 6. Sunday wrap.
  if (weekDone) {
    const wrapLines = await generateWeeklyCommentary({
      week_start: wkStart,
      totals: { [a.name]: totalA, [b.name]: totalB },
      shared_goal: { target: SHARED_GOAL_TARGET, progress: totalA + totalB, met: totalA + totalB >= SHARED_GOAL_TARGET },
      season_record: seasonRecord,
    });
    if (wrapLines.length > 0) {
      await db()
        .from("commentary")
        .insert(wrapLines.map((l) => ({ matchup_id: matchup.id, scope: "week", date, message: l.message, tone: l.tone })));
    }
  }

  // 7. Morning push: the "who won" moment waiting when you wake up.
  const headline =
    dailyWinner === null
      ? `Dead heat — ${scoreA.total} apiece. Rivalry intensifies.`
      : `${nameOf(dailyWinner, users)} takes the day, ${Math.max(scoreA.total, scoreB.total)}–${Math.min(scoreA.total, scoreB.total)}.`;
  await Promise.all(users.map((u) => sendPushToUser(u.id, "Anjaneya Bois — verdict is in", headline)));

  return { date, scoreA: scoreA.total, scoreB: scoreB.total, dailyWinner, recoveryWinner };
}

// ── 13:00 / 19:00 pulse ─────────────────────────────────────────────────────

export async function pulse(now: Date = new Date()): Promise<object> {
  const date = localToday(now);
  const { users } = await loadMatchup();
  const [a, b] = users;

  for (const user of users) {
    await pullMetrics(user, date).catch((err) =>
      console.error(`pulse pull failed for ${user.name}`, err),
    );
  }
  const scoreA = await scoreDay(a, date, false);
  const scoreB = await scoreDay(b, date, false);
  const scores: Record<string, DailyScore> = { [a.id]: scoreA, [b.id]: scoreB };

  // The two pulses run at 07:30 UTC (13:00 IST) and 13:30 UTC (19:00 IST).
  const evening = now.getUTCHours() >= 12;
  for (const user of users) {
    const mine = scores[user.id];
    const theirs = scores[user.id === a.id ? b.id : a.id];
    const rival = user.id === a.id ? b : a;
    if (mine.is_rest_day) continue; // rest is rewarded, not nagged

    let type: string;
    let fallback: string;
    if (theirs.total > mine.total) {
      const gap = theirs.total - mine.total;
      type = "behind_in_duel";
      fallback = `You're at ${mine.total}, ${rival.name} is at ${theirs.total}. ${gap} points to claw back before 4am.`;
    } else {
      const weakest = weakestPillar(mine);
      if (weakest.gap < 5) continue; // strong day everywhere — no nag needed
      type = "weakest_pillar";
      fallback =
        weakest.pillar === "steps"
          ? `You're at ${mine.total} — a ${evening ? "20-min walk" : "lunch walk"} closes the steps gap (${weakest.gap} pts on the table).`
          : `You're at ${mine.total} — a session logged ${evening ? "tonight" : "today"} is worth up to ${weakest.gap} pts.`;
    }

    // Skip if we already nudged this user for this reason today.
    const { data: existing } = await db()
      .from("nudges")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("type", type);
    if (existing && existing.length >= (evening ? 2 : 1)) continue;

    const message = await phraseNudge(fallback, {
      me: user.name,
      rival: rival.name,
      my_score: mine.total,
      rival_score: theirs.total,
      time_of_day: evening ? "evening" : "midday",
    });
    await db().from("nudges").insert({ user_id: user.id, date, type, message });
    await sendPushToUser(user.id, "Anjaneya Bois", message);
  }

  return { date, scoreA: scoreA.total, scoreB: scoreB.total };
}

// ── Records & streaks ───────────────────────────────────────────────────────

function pickWinner(a: number, b: number, idA: string, idB: string): string | null {
  if (a === b) return null;
  return a > b ? idA : idB;
}

function sum(rows: Array<{ user_id: string; total: number }>, userId: string): number {
  return rows.filter((r) => r.user_id === userId).reduce((s, r) => s + r.total, 0);
}

function nameOf(id: string, users: [User, User]): string {
  return users.find((u) => u.id === id)?.name ?? "someone";
}

async function seasonRecordString(matchup: Matchup, a: User, b: User, date: string): Promise<string> {
  const seasonStart = `${date.slice(0, 7)}-01`;
  const { data: duels } = await db()
    .from("duels")
    .select("winner, type")
    .eq("matchup_id", matchup.id)
    .eq("type", "daily")
    .gte("date", seasonStart)
    .lte("date", date);
  const wins = (id: string) => (duels ?? []).filter((d) => d.winner === id).length;
  const draws = (duels ?? []).filter((d) => d.winner === null).length;
  return `${a.name} ${wins(a.id)}W – ${b.name} ${wins(b.id)}W – ${draws}D this season`;
}

async function streakString(matchup: Matchup, a: User, b: User, date: string): Promise<string | undefined> {
  const { data: duels } = await db()
    .from("duels")
    .select("winner, date")
    .eq("matchup_id", matchup.id)
    .eq("type", "daily")
    .lte("date", date)
    .order("date", { ascending: false })
    .limit(10);
  if (!duels || duels.length === 0) return undefined;
  const leader = duels[0].winner;
  if (!leader) return undefined;
  let n = 0;
  for (const d of duels) {
    if (d.winner === leader) n++;
    else break;
  }
  if (n < 2) return undefined;
  const name = leader === a.id ? a.name : b.name;
  return `${name} has won ${n} straight daily duels`;
}
