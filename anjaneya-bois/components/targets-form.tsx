"use client";

import { useState } from "react";
import type { Targets } from "@/lib/types";

export default function TargetsForm({ initial }: { initial: Targets }) {
  const [targets, setTargets] = useState<Targets>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setStatus("saving");
    await fetch("/api/targets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(targets),
    });
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 1500);
  }

  const field = (label: string, key: keyof Targets, min: number, max: number, step: number) => (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span style={{ color: "var(--ink-2)" }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={targets[key]}
        onChange={(e) => setTargets({ ...targets, [key]: Number(e.target.value) })}
        className="w-24 rounded-lg px-2 py-1 text-right tabular-nums"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2">
      {field("Sleep (min/night)", "sleep_minutes", 240, 720, 15)}
      {field("Steps (per day)", "steps", 2000, 40000, 500)}
      {field("Training (min, training day)", "training_minutes", 15, 240, 5)}
      <button
        onClick={save}
        disabled={status === "saving"}
        className="mt-1 w-fit rounded-xl px-4 py-2 text-sm font-semibold"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      >
        {status === "saved" ? "Saved ✓" : status === "saving" ? "Saving…" : "Save targets"}
      </button>
    </div>
  );
}
