import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/supabase";

// Edit personal targets (Settings screen). Targets are per-user so the contest
// stays fair across different fitness levels (PRD: fairness by baseline).
export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const targets = {
    sleep_minutes: clamp(Number(body.sleep_minutes), 240, 720),
    steps: clamp(Number(body.steps), 2000, 40000),
    training_minutes: clamp(Number(body.training_minutes), 15, 240),
  };
  if (Object.values(targets).some((v) => v == null)) {
    return NextResponse.json({ error: "invalid targets" }, { status: 400 });
  }
  await db().from("users").update({ targets_json: targets }).eq("id", userId);
  return NextResponse.json({ ok: true, targets });
}

function clamp(v: number, min: number, max: number): number | null {
  if (!Number.isFinite(v)) return null;
  return Math.min(Math.max(v, min), max);
}
