import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { exchangeCode } from "@/lib/health/google-health";
import { db } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const userId = await currentUserId();

  const settingsUrl = new URL("/settings", url.origin);
  if (!code || !userId || state !== userId) {
    settingsUrl.searchParams.set("google", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCode(code);
    await db()
      .from("google_tokens")
      .upsert({ user_id: userId, ...tokens, updated_at: new Date().toISOString() });
    await db().from("users").update({ google_health_connected: true }).eq("id", userId);
    settingsUrl.searchParams.set("google", "connected");
  } catch (err) {
    console.error("google oauth callback failed", err);
    settingsUrl.searchParams.set("google", "error");
  }
  return NextResponse.redirect(settingsUrl);
}
