"use client";

import { useEffect, useState } from "react";

export default function EnablePush() {
  const [state, setState] = useState<"idle" | "enabled" | "unsupported" | "denied">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
    } else if (Notification.permission === "granted") {
      setState("enabled");
    } else if (Notification.permission === "denied") {
      setState("denied");
    }
  }, []);

  async function enable() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    setState("enabled");
  }

  if (state === "unsupported") return <p className="text-xs" style={{ color: "var(--ink-3)" }}>Push not supported in this browser.</p>;
  if (state === "enabled") return <p className="text-xs" style={{ color: "var(--good)" }}>Nudges enabled ✓</p>;
  if (state === "denied") return <p className="text-xs" style={{ color: "var(--warn)" }}>Notifications blocked — enable in browser settings.</p>;

  return (
    <button
      className="rounded-xl px-4 py-2 text-sm font-semibold"
      style={{ background: "var(--user-a)", color: "#fff" }}
      onClick={enable}
    >
      Enable nudge notifications
    </button>
  );
}
