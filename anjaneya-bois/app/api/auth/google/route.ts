import { NextResponse } from "next/server";
import { currentUserId } from "@/lib/auth";
import { buildAuthUrl } from "@/lib/health/google-health";

// Kick off Google OAuth for the signed-in user. `state` carries the user id
// (verified again on callback via the session cookie).
export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.GOOGLE_REDIRECT_URI!));
  return NextResponse.redirect(buildAuthUrl(userId));
}
