// v1 auth: the two of you share a passcode, then pick who you are.
// The signed cookie carries the user id. (Supabase Auth can replace this later
// without touching the rest of the app — everything downstream only needs a user id.)

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "ab_session";

function secret(): string {
  const s = process.env.APP_SESSION_SECRET;
  if (!s) throw new Error("APP_SESSION_SECRET not set");
  return s;
}

export function sign(userId: string): string {
  const mac = createHmac("sha256", secret()).update(userId).digest("hex");
  return `${userId}.${mac}`;
}

export function verify(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const userId = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(userId).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return userId;
}

export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  return verify(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;

export function checkPasscode(passcode: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  const a = Buffer.from(passcode);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Guard for Vercel cron routes: they arrive with Authorization: Bearer CRON_SECRET. */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
