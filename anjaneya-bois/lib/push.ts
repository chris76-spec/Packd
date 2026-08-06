// PWA Web Push delivery (PRD §6.4 build decision: web push for v1).

import webpush from "web-push";
import { db } from "./supabase";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  configured = true;
  return true;
}

export async function sendPushToUser(userId: string, title: string, body: string): Promise<void> {
  if (!ensureConfigured()) return;
  const { data: subs } = await db()
    .from("push_subscriptions")
    .select("id, endpoint, keys_json")
    .eq("user_id", userId);
  if (!subs) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys_json },
          JSON.stringify({ title, body }),
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db().from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
