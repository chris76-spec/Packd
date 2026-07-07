"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { navyBodyFat } from "@/lib/bf";
import { todayISO, uid } from "@/lib/format";
import type { ActivityType, AdherenceStatus, WeightEntry, MeasurementEntry } from "@/lib/types";
import { Field, PrimaryButton, SectionLabel, Sheet, inputCls } from "./ui";

function num(v: string): number | null {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------------- Weight ---------------- */

export function WeightSheet({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: WeightEntry }) {
  const { data, update } = useStore();
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(todayISO());
  const [tod, setTod] = useState<"morning" | "afternoon" | "evening">("morning");

  useEffect(() => {
    if (!open) return;
    setKg(edit ? String(edit.weightKg) : "");
    setDate(edit?.date ?? todayISO());
    setTod(edit?.timeOfDay ?? "morning");
  }, [open, edit]);

  const save = () => {
    const w = num(kg);
    if (!w) return;
    update((d) => ({
      ...d,
      weights: edit
        ? d.weights.map((e) => (e.id === edit.id ? { ...e, weightKg: w, date, timeOfDay: tod } : e))
        : [...d.weights, { id: uid(), userId: d.currentUserId, weightKg: w, date, timeOfDay: tod }],
    }));
    onClose();
  };

  const last = [...data.weights.filter((w) => w.userId === data.currentUserId)].sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <Sheet title={edit ? "Edit weight" : "Log weight"} open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Weight (kg)">
          <input className={inputCls} type="number" inputMode="decimal" step="0.1" value={kg} placeholder={last ? String(last.weightKg) : "0.0"} onChange={(e) => setKg(e.target.value)} autoFocus />
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time of day">
          <div className="flex gap-2">
            {(["morning", "afternoon", "evening"] as const).map((t) => (
              <button key={t} onClick={() => setTod(t)} className={`flex-1 rounded-xl border px-2 py-2.5 text-[13px] capitalize ${tod === t ? "border-accent/70 bg-accent/10 text-accent" : "border-line bg-card2 text-muted"}`}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <PrimaryButton onClick={save} disabled={!num(kg)}>
          {edit ? "Save changes" : "Save weight"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Diet adherence ---------------- */

export function DietSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, update } = useStore();
  const [status, setStatus] = useState<AdherenceStatus | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    const existing = data.adherence.find((a) => a.userId === data.currentUserId && a.date === todayISO());
    setStatus(existing?.status ?? null);
    setNote(existing?.note ?? "");
    setDate(todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = () => {
    if (!status) return;
    update((d) => {
      const rest = d.adherence.filter((a) => !(a.userId === d.currentUserId && a.date === date));
      return { ...d, adherence: [...rest, { id: uid(), userId: d.currentUserId, date, status, note: note || undefined }] };
    });
    onClose();
  };

  const opts: { v: AdherenceStatus; label: string; hint: string }[] = [
    { v: "yes", label: "Yes ✓", hint: "Stuck to the plan" },
    { v: "partial", label: "Partial", hint: "Mostly on track" },
    { v: "no", label: "No", hint: "Off plan today" },
  ];

  return (
    <Sheet title="Diet adherence" open={open} onClose={onClose}>
      <p className="mb-4 text-[14px] text-muted">Did you stick to your diet plan today?</p>
      <div className="space-y-4">
        <div className="flex gap-2">
          {opts.map((o) => (
            <button key={o.v} onClick={() => setStatus(o.v)} className={`flex-1 rounded-xl border px-2 py-3 text-center ${status === o.v ? "border-sage/80 bg-sage/10" : "border-line bg-card2"}`}>
              <div className={`text-[14px] font-semibold ${status === o.v ? "text-sage" : "text-cream"}`}>{o.label}</div>
              <div className="mt-0.5 text-[10px] text-faint">{o.hint}</div>
            </button>
          ))}
        </div>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} value={note} placeholder="One line…" onChange={(e) => setNote(e.target.value)} />
        </Field>
        <PrimaryButton onClick={save} disabled={!status}>
          Save check-in
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Activity ---------------- */

export function ActivitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update } = useStore();
  const [type, setType] = useState<ActivityType>("badminton");
  const [date, setDate] = useState(todayISO());
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setType("badminton");
    setDate(todayISO());
    setDuration("");
    setDistance("");
    setNote("");
  }, [open]);

  const save = () => {
    const dur = num(duration);
    if (!dur) return;
    update((d) => ({
      ...d,
      activities: [
        ...d.activities,
        { id: uid(), userId: d.currentUserId, date, type, durationMin: dur, distanceKm: num(distance) ?? undefined, note: note || undefined },
      ],
    }));
    onClose();
  };

  return (
    <Sheet title="Log activity" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Type">
          <div className="grid grid-cols-3 gap-2">
            {(["badminton", "walk", "run", "cardio", "other"] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={`rounded-xl border px-2 py-2.5 text-[13px] capitalize ${type === t ? "border-accent/70 bg-accent/10 text-accent" : "border-line bg-card2 text-muted"}`}>
                {t}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration (min)">
            <input className={inputCls} type="number" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Distance (km)">
            <input className={inputCls} type="number" inputMode="decimal" step="0.1" value={distance} placeholder="—" onChange={(e) => setDistance(e.target.value)} disabled={type === "badminton"} />
          </Field>
        </div>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <PrimaryButton onClick={save} disabled={!num(duration)}>
          Save activity
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Photo ---------------- */

async function fileToDataUrl(file: File, maxDim = 720): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { update } = useStore();
  const [angle, setAngle] = useState<"front" | "side" | "back">("front");
  const [preview, setPreview] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setAngle("front");
    setPreview(null);
    setDate(todayISO());
  }, [open]);

  const save = () => {
    if (!preview) return;
    update((d) => ({
      ...d,
      photos: [...d.photos, { id: uid(), userId: d.currentUserId, date, angle, dataUrl: preview }],
    }));
    onClose();
  };

  return (
    <Sheet title="Progress photo" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Angle">
          <div className="flex gap-2">
            {(["front", "side", "back"] as const).map((a) => (
              <button key={a} onClick={() => setAngle(a)} className={`flex-1 rounded-xl border px-2 py-2.5 text-[13px] capitalize ${angle === a ? "border-accent/70 bg-accent/10 text-accent" : "border-line bg-card2 text-muted"}`}>
                {a}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Photo">
          <label className="flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-card2">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[13px] text-faint">Tap to choose / capture</span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPreview(await fileToDataUrl(f));
              }}
            />
          </label>
        </Field>
        <Field label="Date">
          <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <PrimaryButton onClick={save} disabled={!preview}>
          Save photo
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

/* ---------------- Measurements ---------------- */

const M_FIELDS = [
  ["neck", "Neck"],
  ["chest", "Chest"],
  ["waist", "Waist"],
  ["hips", "Hips"],
  ["armL", "Arm (L)"],
  ["armR", "Arm (R)"],
  ["thighs", "Thighs"],
] as const;

export function MeasurementSheet({ open, onClose, edit }: { open: boolean; onClose: () => void; edit?: MeasurementEntry }) {
  const { data, update } = useStore();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const [vals, setVals] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    const latest =
      edit ?? [...data.measurements.filter((m) => m.userId === data.currentUserId)].sort((a, b) => b.date.localeCompare(a.date))[0];
    const v: Record<string, string> = {};
    for (const [k] of M_FIELDS) v[k] = latest ? String(latest[k as keyof MeasurementEntry]) : "";
    setVals(v);
    setDate(edit?.date ?? todayISO());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, edit]);

  const parsed = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k] of M_FIELDS) {
      const n = num(vals[k] ?? "");
      if (n === null) return null;
      out[k] = n;
    }
    return out;
  }, [vals]);

  const bf = parsed ? navyBodyFat(me.sex, me.heightCm, parsed.neck, parsed.waist, parsed.hips) : null;

  const save = () => {
    if (!parsed || bf === null) return;
    const entry: MeasurementEntry = {
      id: edit?.id ?? uid(),
      userId: data.currentUserId,
      date,
      neck: parsed.neck,
      chest: parsed.chest,
      waist: parsed.waist,
      hips: parsed.hips,
      armL: parsed.armL,
      armR: parsed.armR,
      thighs: parsed.thighs,
      bfPercent: bf,
    };
    update((d) => ({
      ...d,
      measurements: edit ? d.measurements.map((m) => (m.id === edit.id ? entry : m)) : [...d.measurements, entry],
    }));
    onClose();
  };

  return (
    <Sheet title={edit ? "Edit measurements" : "Log measurements"} open={open} onClose={onClose} tall>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {M_FIELDS.map(([k, label]) => (
            <Field key={k} label={`${label} (cm)`}>
              <input className={inputCls} type="number" inputMode="decimal" step="0.5" value={vals[k] ?? ""} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} />
            </Field>
          ))}
          <Field label="Date">
            <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <div className="rounded-xl border border-line bg-card2 px-4 py-3">
          <SectionLabel className="mb-1">Body fat % · US Navy method</SectionLabel>
          <div className="font-mono text-[22px] font-bold text-cream">{bf !== null ? `${bf} %` : "—"}</div>
          <div className="mt-1 text-[11px] text-faint">Auto-computed from neck, waist{me.sex === "female" ? ", hips" : ""} and your height ({me.heightCm} cm).</div>
        </div>
        <PrimaryButton onClick={save} disabled={!parsed}>
          {edit ? "Save changes" : "Save measurements"}
        </PrimaryButton>
      </div>
    </Sheet>
  );
}
