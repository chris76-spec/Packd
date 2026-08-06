import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { localToday } from "@/lib/dates";
import { scoreDay } from "@/lib/sync";
import { db } from "@/lib/supabase";
import type { User } from "@/lib/types";

// Rest mode toggle (PRD §6.2): removes the exercise pillar and renormalizes.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const date = typeof body.date === "string" ? body.date : localToday();
  const restDay = Boolean(body.is_rest_day);

  const { data: existing } = await db()
    .from("daily_scores")
    .select("locked")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  if (existing?.locked) {
    return NextResponse.json({ error: "day already settled" }, { status: 409 });
  }

  await db()
    .from("daily_scores")
    .upsert(
      { user_id: userId, date, is_rest_day: restDay, sleep_pts: 0, steps_pts: 0, exercise_pts: 0, recovery_pts: 0, total: 0 },
      { onConflict: "user_id,date", ignoreDuplicates: false },
    );
  const { data: user } = await db().from("users").select("*").eq("id", userId).single();
  const score = await scoreDay(user as User, date, false);
  return NextResponse.json({ ok: true, score });
}
