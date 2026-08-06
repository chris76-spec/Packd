import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { localToday } from "@/lib/dates";
import { scoreDay } from "@/lib/sync";
import { db } from "@/lib/supabase";
import type { SessionType, User } from "@/lib/types";

const TYPES: SessionType[] = ["gym", "badminton", "run", "other"];

// One-tap session log (PRD §6.1): type + duration → feeds the exercise pillar.
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const type = body.type as SessionType;
  const duration = Number(body.duration_min);
  const date = typeof body.date === "string" ? body.date : localToday();
  if (!TYPES.includes(type) || !Number.isFinite(duration) || duration <= 0 || duration > 600) {
    return NextResponse.json({ error: "invalid session" }, { status: 400 });
  }

  await db().from("sessions").insert({ user_id: userId, date, type, duration_min: Math.round(duration) });

  // Re-score immediately so the Today screen reflects the session.
  const { data: user } = await db().from("users").select("*").eq("id", userId).single();
  const score = await scoreDay(user as User, date, false);
  return NextResponse.json({ ok: true, score });
}

export async function DELETE(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const { data: session } = await db().from("sessions").select("*").eq("id", id).eq("user_id", userId).single();
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db().from("sessions").delete().eq("id", id);
  const { data: user } = await db().from("users").select("*").eq("id", userId).single();
  const score = await scoreDay(user as User, session.date, false);
  return NextResponse.json({ ok: true, score });
}
