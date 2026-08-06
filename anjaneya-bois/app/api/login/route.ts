import { NextResponse } from "next/server";
import { checkPasscode, sign, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  const { passcode, userId } = await req.json();
  if (!checkPasscode(passcode ?? "")) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const { data: user } = await db().from("users").select("id").eq("id", userId).single();
  if (!user) return NextResponse.json({ error: "Unknown user" }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return res;
}

export async function GET() {
  // The login page needs the user list to render the picker.
  const { data: users } = await db().from("users").select("id, name").order("created_at");
  return NextResponse.json({ users: users ?? [] });
}
