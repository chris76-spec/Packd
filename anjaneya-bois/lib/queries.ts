// Read-side queries shared by the server-rendered screens.

import { currentUserId } from "./auth";
import { addDays, dateRange, localToday, localYesterday, monthStart, weekStart } from "./dates";
import { db, unwrap } from "./supabase";
import type { DailyScore, Duel, Matchup, User, WeeklyRow } from "./types";

export interface Viewer {
  me: User;
  rival: User;
  matchup: Matchup;
}

export async function getViewer(): Promise<Viewer | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const { data: matchup } = await db().from("matchups").select("*").limit(1).single();
  if (!matchup) return null;
  const users = unwrap<User[]>(
    await db().from("users").select("*").in("id", [matchup.user_a, matchup.user_b]),
  );
  const me = users.find((u) => u.id === userId);
  const rival = users.find((u) => u.id !== userId);
  if (!me || !rival) return null;
  return { me, rival, matchup: matchup as Matchup };
}

export async function scoresFor(userIds: string[], date: string): Promise<Map<string, DailyScore>> {
  const { data } = await db().from("daily_scores").select("*").in("user_id", userIds).eq("date", date);
  return new Map(((data as DailyScore[]) ?? []).map((s) => [s.user_id, s]));
}

export function emptyScore(userId: string, date: string): DailyScore {
  return {
    user_id: userId,
    date,
    sleep_pts: 0,
    steps_pts: 0,
    exercise_pts: 0,
    recovery_pts: 0,
    calorie_bonus: 0,
    total: 0,
    is_rest_day: false,
  };
}

export async function yesterdayDuel(matchupId: string): Promise<{ daily?: Duel; recovery?: Duel; date: string }> {
  const date = localYesterday();
  const { data } = await db().from("duels").select("*").eq("matchup_id", matchupId).eq("date", date);
  const duels = (data as Duel[]) ?? [];
  return {
    daily: duels.find((d) => d.type === "daily"),
    recovery: duels.find((d) => d.type === "recovery"),
    date,
  };
}

export async function latestCommentary(matchupId: string, scope: "day" | "week", limit = 4) {
  const { data } = await db()
    .from("commentary")
    .select("*")
    .eq("matchup_id", matchupId)
    .eq("scope", scope)
    .order("date", { ascending: false })
    .order("generated_at", { ascending: true })
    .limit(limit);
  const rows = data ?? [];
  const newest = rows[0]?.date;
  return rows.filter((r) => r.date === newest);
}

export interface WeekData {
  weekStart: string;
  days: string[];
  scores: Record<string, Record<string, number>>; // userId -> date -> total
  weekly: WeeklyRow | null;
}

export async function weekData(matchup: Matchup): Promise<WeekData> {
  const today = localToday();
  const start = weekStart(today);
  const days = dateRange(start, addDays(start, 6));
  const { data } = await db()
    .from("daily_scores")
    .select("user_id, date, total")
    .in("user_id", [matchup.user_a, matchup.user_b])
    .gte("date", start)
    .lte("date", days[6]);
  const scores: Record<string, Record<string, number>> = {
    [matchup.user_a]: {},
    [matchup.user_b]: {},
  };
  for (const row of data ?? []) scores[row.user_id][row.date] = row.total;
  const { data: weekly } = await db()
    .from("weekly")
    .select("*")
    .eq("matchup_id", matchup.id)
    .eq("week_start", start)
    .single();
  return { weekStart: start, days, scores, weekly: (weekly as WeeklyRow) ?? null };
}

export interface SeasonStats {
  seasonStart: string;
  daily: { a: number; b: number; draws: number };
  recovery: { a: number; b: number; draws: number };
  weeksWon: { a: number; b: number };
  goalsMetStreak: number;
  recentDuels: Duel[];
  trend: { date: string; a: number | null; b: number | null }[];
}

export async function seasonStats(matchup: Matchup): Promise<SeasonStats> {
  const today = localToday();
  const seasonStart = monthStart(today);

  const { data: duelRows } = await db()
    .from("duels")
    .select("*")
    .eq("matchup_id", matchup.id)
    .gte("date", seasonStart)
    .order("date", { ascending: false });
  const duels = (duelRows as Duel[]) ?? [];
  const tally = (type: string) => {
    const of = duels.filter((d) => d.type === type);
    return {
      a: of.filter((d) => d.winner === matchup.user_a).length,
      b: of.filter((d) => d.winner === matchup.user_b).length,
      draws: of.filter((d) => d.winner === null).length,
    };
  };

  const { data: weeklyRows } = await db()
    .from("weekly")
    .select("*")
    .eq("matchup_id", matchup.id)
    .order("week_start", { ascending: false })
    .limit(12);
  const weeks = (weeklyRows as WeeklyRow[]) ?? [];
  let goalsMetStreak = 0;
  for (const w of weeks) {
    if (w.shared_goal_met === true) goalsMetStreak++;
    else if (w.shared_goal_met === false) break;
  }

  const from = addDays(today, -14);
  const { data: trendRows } = await db()
    .from("daily_scores")
    .select("user_id, date, total")
    .in("user_id", [matchup.user_a, matchup.user_b])
    .gte("date", from)
    .lt("date", today)
    .order("date");
  const byDate = new Map<string, { a: number | null; b: number | null }>();
  for (const d of dateRange(from, addDays(today, -1))) byDate.set(d, { a: null, b: null });
  for (const row of trendRows ?? []) {
    const entry = byDate.get(row.date);
    if (entry) {
      if (row.user_id === matchup.user_a) entry.a = row.total;
      else entry.b = row.total;
    }
  }

  return {
    seasonStart,
    daily: tally("daily"),
    recovery: tally("recovery"),
    weeksWon: {
      a: weeks.filter((w) => w.week_start >= seasonStart && w.winner === matchup.user_a).length,
      b: weeks.filter((w) => w.week_start >= seasonStart && w.winner === matchup.user_b).length,
    },
    goalsMetStreak,
    recentDuels: duels.filter((d) => d.type === "daily").slice(0, 10),
    trend: [...byDate.entries()].map(([date, v]) => ({ date, ...v })),
  };
}

export async function latestReactions(matchupId: string, toUser: string, date: string) {
  const { data } = await db().from("reactions").select("emoji").eq("to_user", toUser).eq("date", date);
  return (data ?? []).map((r) => r.emoji as string);
}
