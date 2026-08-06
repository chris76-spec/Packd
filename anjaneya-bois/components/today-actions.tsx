"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionType } from "@/lib/types";

const SESSION_TYPES: { type: SessionType; label: string }[] = [
  { type: "gym", label: "🏋️ Gym" },
  { type: "badminton", label: "🏸 Badminton" },
  { type: "run", label: "🏃 Run" },
  { type: "other", label: "✨ Other" },
];
const DURATIONS = [30, 45, 60, 90];
const REACTIONS = ["🔥", "💀", "😤", "👑", "🫡", "😴"];

export default function TodayActions({ isRestDay }: { isRestDay: boolean }) {
  const router = useRouter();
  const [logging, setLogging] = useState(false);
  const [type, setType] = useState<SessionType>("gym");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    setBusy(true);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!logging ? (
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl py-3 text-sm font-semibold"
            style={{ background: "var(--user-a)", color: "#fff" }}
            onClick={() => setLogging(true)}
          >
            Log session
          </button>
          <button
            className="flex-1 rounded-xl py-3 text-sm font-semibold"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
            disabled={busy}
            onClick={() => post("/api/rest-day", { is_rest_day: !isRestDay })}
          >
            {isRestDay ? "Rest day ✓ (undo)" : "Mark rest day"}
          </button>
        </div>
      ) : (
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {SESSION_TYPES.map((s) => (
              <button
                key={s.type}
                className="rounded-full px-3 py-1.5 text-sm"
                style={{
                  background: type === s.type ? "var(--user-a)" : "var(--surface-2)",
                  color: type === s.type ? "#fff" : "var(--ink)",
                }}
                onClick={() => setType(s.type)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d}
                className="flex-1 rounded-xl py-2 text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
                disabled={busy}
                onClick={async () => {
                  await post("/api/sessions", { type, duration_min: d });
                  setLogging(false);
                }}
              >
                {d}m
              </button>
            ))}
          </div>
          <button className="text-xs" style={{ color: "var(--ink-3)" }} onClick={() => setLogging(false)}>
            cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-xs" style={{ color: "var(--ink-3)" }}>
          React to their day:
        </span>
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            className="rounded-full p-1.5 text-lg leading-none"
            style={{ background: "var(--surface-2)" }}
            disabled={busy}
            onClick={() => post("/api/reactions", { emoji })}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
