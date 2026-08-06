import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sub = await req.json();
  if (!sub?.endpoint || !sub?.keys) return NextResponse.json({ error: "invalid subscription" }, { status: 400 });

  await db()
    .from("push_subscriptions")
    .upsert({ user_id: userId, endpoint: sub.endpoint, keys_json: sub.keys }, { onConflict: "endpoint" });
  return NextResponse.json({ ok: true });
}
