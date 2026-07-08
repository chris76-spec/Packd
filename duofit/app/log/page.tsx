"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { workoutVolume } from "@/lib/derive";
import { friendlyDate, headerDate, kg, todayISO } from "@/lib/format";
import type { AppData } from "@/lib/types";
import { Card, SectionLabel, Sheet, useConfirmDelete } from "@/components/ui";
import {
  CameraIcon,
  CheckCircleIcon,
  ChevronRight,
  DumbbellIcon,
  PersonIcon,
  RunIcon,
  ScaleIcon,
  TrashIcon,
} from "@/components/icons";
import { ActivitySheet, DietSheet, MeasurementSheet, PhotoSheet, WeightSheet } from "@/components/sheets";
import { WorkoutSheet } from "@/components/workout-logger";

type LogItem = {
  kind: "workout" | "weight" | "diet" | "activity" | "photo" | "measurement";
  id: string;
  date: string;
  title: string;
  subtitle: string;
  tint: string;
  Icon: React.ComponentType<{ size?: number }>;
};

function buildItems(data: AppData): LogItem[] {
  const uid = data.currentUserId;
  const items: LogItem[] = [];
  for (const w of data.workouts.filter((w) => w.userId === uid))
    items.push({
      kind: "workout",
      id: w.id,
      date: w.date,
      title: w.name,
      subtitle: `${friendlyDate(w.date)} · ${workoutVolume(w).toLocaleString("en-US")} kg total`,
      tint: "var(--color-accent)",
      Icon: DumbbellIcon,
    });
  for (const w of data.weights.filter((w) => w.userId === uid))
    items.push({
      kind: "weight",
      id: w.id,
      date: w.date,
      title: `${kg(w.weightKg)} kg`,
      subtitle: `${friendlyDate(w.date)}${w.timeOfDay ? ` · ${w.timeOfDay}` : ""}`,
      tint: "var(--color-gold)",
      Icon: ScaleIcon,
    });
  for (const a of data.adherence.filter((a) => a.userId === uid))
    items.push({
      kind: "diet",
      id: a.id,
      date: a.date,
      title: `Diet: ${a.status === "yes" ? "Yes ✓" : a.status === "partial" ? "Partial" : "No"}`,
      subtitle: friendlyDate(a.date),
      tint: "var(--color-sage)",
      Icon: CheckCircleIcon,
    });
  for (const a of data.activities.filter((a) => a.userId === uid))
    items.push({
      kind: "activity",
      id: a.id,
      date: a.date,
      title: a.type[0].toUpperCase() + a.type.slice(1),
      subtitle: `${friendlyDate(a.date)} · ${a.durationMin} min${a.distanceKm ? ` · ${a.distanceKm} km` : ""}`,
      tint: "var(--color-sage)",
      Icon: RunIcon,
    });
  for (const p of data.photos.filter((p) => p.userId === uid))
    items.push({
      kind: "photo",
      id: p.id,
      date: p.date,
      title: `Photo · ${p.angle}`,
      subtitle: friendlyDate(p.date),
      tint: "var(--color-cream)",
      Icon: CameraIcon,
    });
  for (const m of data.measurements.filter((m) => m.userId === uid))
    items.push({
      kind: "measurement",
      id: m.id,
      date: m.date,
      title: `Measurements · BF ${m.bfPercent}%`,
      subtitle: friendlyDate(m.date),
      tint: "var(--color-gold)",
      Icon: PersonIcon,
    });
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

const QUICK = [
  { key: "weight", label: "Weight", Icon: ScaleIcon },
  { key: "workout", label: "Workout", Icon: DumbbellIcon },
  { key: "diet", label: "Diet", Icon: CheckCircleIcon },
  { key: "photo", label: "Photo", Icon: CameraIcon },
  { key: "activity", label: "Activity", Icon: RunIcon },
  { key: "measure", label: "Measure", Icon: PersonIcon },
] as const;

export default function LogPage() {
  const { data, update } = useStore();
  const confirmDelete = useConfirmDelete();
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<LogItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shown, setShown] = useState(12);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const items = useMemo(() => buildItems(data), [data]);

  const editWorkout = selected?.kind === "workout" ? data.workouts.find((w) => w.id === selected.id) : undefined;
  const editWeight = selected?.kind === "weight" ? data.weights.find((w) => w.id === selected.id) : undefined;
  const editMeasurement = selected?.kind === "measurement" ? data.measurements.find((m) => m.id === selected.id) : undefined;
  const selectedPhoto = selected?.kind === "photo" ? data.photos.find((p) => p.id === selected.id) : undefined;

  const removeSelected = () => {
    if (!selected || !confirmDelete(selected.kind)) return;
    const { kind, id } = selected;
    update((d) => ({
      ...d,
      workouts: kind === "workout" ? d.workouts.filter((x) => x.id !== id) : d.workouts,
      weights: kind === "weight" ? d.weights.filter((x) => x.id !== id) : d.weights,
      adherence: kind === "diet" ? d.adherence.filter((x) => x.id !== id) : d.adherence,
      activities: kind === "activity" ? d.activities.filter((x) => x.id !== id) : d.activities,
      photos: kind === "photo" ? d.photos.filter((x) => x.id !== id) : d.photos,
      measurements: kind === "measurement" ? d.measurements.filter((x) => x.id !== id) : d.measurements,
    }));
    setSelected(null);
    setToast("Entry deleted");
  };

  const canEdit = selected && ["workout", "weight", "measurement"].includes(selected.kind);

  return (
    <div>
      <SectionLabel>{headerDate(todayISO()).split(",")[0]}</SectionLabel>
      <h1 className="mt-1 font-serif text-[36px] leading-tight text-cream">
        Log<span className="text-accent">.</span>
      </h1>

      <div className="mt-5 grid grid-cols-4 gap-3">
        {QUICK.slice(0, 4).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setOpen(key)} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-4 active:bg-card2">
            <Icon size={21} />
            <span className="text-[12px] text-muted">{label}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {QUICK.slice(4).map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setOpen(key)} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-4 active:bg-card2">
            <Icon size={21} />
            <span className="text-[12px] text-muted">{label}</span>
          </button>
        ))}
      </div>

      <SectionLabel className="mb-3 mt-7">Recent Logs</SectionLabel>
      <div className="space-y-3">
        {items.slice(0, shown).map((it) => (
          <Card key={`${it.kind}-${it.id}`} onClick={() => setSelected(it)} className="flex items-center gap-4 p-4">
            <span className="rounded-full p-2.5" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: it.tint }}>
              <it.Icon size={19} />
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-semibold text-cream">{it.title}</span>
              <span className="block text-[13px] text-muted">{it.subtitle}</span>
            </span>
            <ChevronRight size={17} className="text-faint" />
          </Card>
        ))}
        {items.length > shown && (
          <button onClick={() => setShown((n) => n + 12)} className="w-full py-2 text-center text-[13px] text-muted">
            Show more
          </button>
        )}
      </div>

      {/* quick-entry sheets */}
      <WeightSheet open={open === "weight"} onClose={() => setOpen(null)} />
      <DietSheet open={open === "diet"} onClose={() => setOpen(null)} />
      <ActivitySheet open={open === "activity"} onClose={() => setOpen(null)} />
      <PhotoSheet open={open === "photo"} onClose={() => setOpen(null)} />
      <MeasurementSheet open={open === "measure"} onClose={() => setOpen(null)} />
      <WorkoutSheet open={open === "workout"} onClose={() => setOpen(null)} onSaved={setToast} />

      {/* entry detail: edit / delete */}
      <Sheet title={selected?.title ?? ""} open={!!selected && !open} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3">
            <div className="text-[13px] text-muted">{selected.subtitle}</div>
            {selectedPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPhoto.dataUrl} alt={`${selectedPhoto.angle} progress`} className="max-h-72 w-full rounded-xl object-cover" />
            )}
            {canEdit && (
              <button
                onClick={() => setOpen(`edit-${selected.kind}`)}
                className="w-full rounded-xl border border-line bg-card2 py-3 text-[14px] font-medium text-cream"
              >
                Edit entry
              </button>
            )}
            {selected.kind === "diet" && (
              <button onClick={() => setOpen("diet")} className="w-full rounded-xl border border-line bg-card2 py-3 text-[14px] font-medium text-cream">
                Update today&apos;s check-in
              </button>
            )}
            <button onClick={removeSelected} className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-red-950/30 py-3 text-[14px] font-medium text-red-300">
              <TrashIcon size={16} /> Delete
            </button>
          </div>
        )}
      </Sheet>

      {/* edit sheets */}
      <WeightSheet
        open={open === "edit-weight"}
        onClose={() => {
          setOpen(null);
          setSelected(null);
        }}
        edit={editWeight}
      />
      <MeasurementSheet
        open={open === "edit-measurement"}
        onClose={() => {
          setOpen(null);
          setSelected(null);
        }}
        edit={editMeasurement}
      />
      <WorkoutSheet
        open={open === "edit-workout"}
        onClose={() => {
          setOpen(null);
          setSelected(null);
        }}
        edit={editWorkout}
        onSaved={setToast}
      />

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-card2 px-5 py-2.5 text-[13px] text-cream shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
