"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/store";
import { exportCSV } from "@/lib/csv";
import { todayISO } from "@/lib/format";
import { Card, SectionLabel, inputCls } from "@/components/ui";
import { Avatar } from "@/components/ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[14px] text-muted">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-accent" : "bg-card2"}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-cream transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { data, update, reset } = useStore();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const [height, setHeight] = useState(String(me.heightCm));
  const [prefs, setPrefs] = useState({ weighIn: true, workout: true, diet: true, nightShift: me.id === "christopher" });

  const download = () => {
    const csv = exportCSV(data, me.id);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `duofit-${me.id}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveHeight = () => {
    const h = parseFloat(height);
    if (!Number.isFinite(h) || h < 100 || h > 230) return;
    update((d) => ({ ...d, profiles: d.profiles.map((p) => (p.id === me.id ? { ...p, heightCm: h } : p)) }));
  };

  return (
    <div>
      <SectionLabel>Preferences</SectionLabel>
      <h1 className="mt-1 font-serif text-[36px] leading-tight text-cream">
        Settings<span className="text-accent">.</span>
      </h1>

      <SectionLabel className="mb-3 mt-6">Active User</SectionLabel>
      <div className="flex gap-3">
        {data.profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => update((d) => ({ ...d, currentUserId: p.id }))}
            className={`flex flex-1 items-center gap-3 rounded-2xl border p-4 ${
              p.id === me.id ? "border-accent/60 bg-accent/5" : "border-line bg-card"
            }`}
          >
            <Avatar name={p.name} tint={p.tint} size={34} />
            <span className="text-left">
              <span className="block text-[15px] font-semibold text-cream">{p.name}</span>
              <span className="block text-[11px] text-faint">{p.id === me.id ? "logging as" : "switch"}</span>
            </span>
          </button>
        ))}
      </div>

      <SectionLabel className="mb-3 mt-6">Profile</SectionLabel>
      <Card className="px-4 py-1">
        <Row label="Height (for BF%)">
          <span className="flex items-center gap-2">
            <input
              className={`${inputCls} !w-24 !py-2 text-right`}
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              onBlur={saveHeight}
            />
            <span className="text-[12px] text-muted">cm</span>
          </span>
        </Row>
        <Row label="Sex (BF% formula)">
          <span className="font-mono text-[13px] capitalize text-cream">{me.sex}</span>
        </Row>
      </Card>

      <SectionLabel className="mb-3 mt-6">Reminders</SectionLabel>
      <Card className="px-4 py-1">
        <Row label="Weekly weigh-in">
          <Toggle on={prefs.weighIn} onChange={(v) => setPrefs((p) => ({ ...p, weighIn: v }))} />
        </Row>
        <Row label="Workout reminder">
          <Toggle on={prefs.workout} onChange={(v) => setPrefs((p) => ({ ...p, workout: v }))} />
        </Row>
        <Row label="Daily diet check">
          <Toggle on={prefs.diet} onChange={(v) => setPrefs((p) => ({ ...p, diet: v }))} />
        </Row>
        <Row label="Night-shift aware (6 PM–3 AM)">
          <Toggle on={prefs.nightShift} onChange={(v) => setPrefs((p) => ({ ...p, nightShift: v }))} />
        </Row>
      </Card>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        Reminder windows respect your routine — with night shift on, prompts move to post-shift mornings. Push delivery ships with
        Phase 4 (PWA notifications).
      </p>

      <SectionLabel className="mb-3 mt-6">Integrations</SectionLabel>
      <Card className="px-4 py-1">
        <Row label="Google Health sync">
          <span className="rounded-full bg-card2 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-faint">Phase 4</span>
        </Row>
      </Card>

      <SectionLabel className="mb-3 mt-6">Data</SectionLabel>
      <div className="space-y-3">
        <button onClick={download} className="w-full rounded-2xl border border-line bg-card p-4 text-left">
          <span className="block text-[15px] font-semibold text-cream">Export my data (CSV)</span>
          <span className="block text-[12px] text-muted">Weights, measurements, workouts &amp; sets, activities, adherence.</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm("Reset all data back to the demo seed? Your logged entries will be lost.")) reset();
          }}
          className="w-full rounded-2xl border border-red-900/50 bg-red-950/20 p-4 text-left"
        >
          <span className="block text-[15px] font-semibold text-red-300">Reset demo data</span>
          <span className="block text-[12px] text-red-300/60">Restores the seeded 8-week history.</span>
        </button>
      </div>

      <p className="mt-6 text-center font-mono text-[11px] tracking-widest text-faint">DUOFIT · PRIVATE · TWO ACCOUNTS ONLY</p>
    </div>
  );
}
