import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { localYesterday } from "@/lib/dates";
import { sendPushToUser } from "@/lib/push";
import { db } from "@/lib/supabase";

const ALLOWED = ["🔥", "💀", "😤", "👑", "🫡", "😴"];

// One-tap emoji reaction to the partner's day (PRD §5).
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const emoji = String(body.emoji ?? "");
  const date = typeof body.date === "string" ? body.date : localYesterday();
  if (!ALLOWED.includes(emoji)) return NextResponse.json({ error: "invalid emoji" }, { status: 400 });

  const { data: matchup } = await db().from("matchups").select("*").limit(1).single();
  if (!matchup) return NextResponse.json({ error: "no matchup" }, { status: 500 });
  const toUser = matchup.user_a === userId ? matchup.user_b : matchup.user_a;

  await db().from("reactions").insert({ from_user: userId, to_user: toUser, date, emoji });
  const { data: me } = await db().from("users").select("name").eq("id", userId).single();
  await sendPushToUser(toUser, "Anjaneya Bois", `${me?.name ?? "Your rival"} reacted ${emoji} to your day`);
  return NextResponse.json({ ok: true });
}
