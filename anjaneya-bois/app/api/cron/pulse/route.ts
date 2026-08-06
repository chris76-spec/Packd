import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { pulse } from "@/lib/sync";

export const maxDuration = 300;

// 13:00 + 19:00 local: partial pull for today, then behavioral nudges.
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await pulse();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("pulse failed", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
