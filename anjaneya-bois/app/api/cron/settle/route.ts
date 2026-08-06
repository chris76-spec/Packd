import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { settleDay } from "@/lib/sync";

export const maxDuration = 300;

// 04:00 local (22:30 UTC for IST): settle yesterday — final pull, lock scores,
// decide duels, weekly league + shared goal, AI commentary, Sunday wrap.
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await settleDay();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("settle failed", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
