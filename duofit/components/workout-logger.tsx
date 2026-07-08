"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { derivePRs, previousPerformance } from "@/lib/derive";
import { MUSCLE_GROUPS } from "@/lib/exercises";
import { shortDate, todayISO, uid } from "@/lib/format";
import type { Exercise, Workout } from "@/lib/types";
import { CheckCircleIcon, PlusIcon, XIcon } from "./icons";
import { Chip, Field, PrimaryButton, SectionLabel, Sheet, inputCls } from "./ui";

interface DraftSet {
  reps: string;
  weight: string;
  isWarmup?: boolean;
  isFailure?: boolean;
  done?: boolean;
}

interface DraftExercise {
  exerciseId: string;
  sets: DraftSet[];
}

const SESSION_NAMES = ["Push A", "Pull A", "Legs A", "Push B", "Upper", "Lower", "Full Body"];
const REST_SECONDS = 90;

function RestTimer({ until, onDismiss }: { until: number; onDismiss: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  if (left <= 0) return null;
  return (
    <button onClick={onDismiss} className="fixed bottom-28 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/50 bg-card px-4 py-2 font-mono text-[14px] text-accent shadow-xl">
      Rest {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      <XIcon size={13} />
    </button>
  );
}

function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const { data, update } = useStore();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<Exercise["muscleGroup"]>("chest");
  const [newEquip, setNewEquip] = useState<Exercise["equipment"]>("barbell");

  useEffect(() => {
    if (open) {
      setQ("");
      setGroup(null);
      setAdding(false);
    }
  }, [open]);

  const list = data.exercises
    .filter((e) => (!group || e.muscleGroup === group) && e.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const addCustom = () => {
    if (!newName.trim()) return;
    const id = `custom-${uid()}`;
    update((d) => ({
      ...d,
      exercises: [...d.exercises, { id, name: newName.trim(), muscleGroup: newGroup, equipment: newEquip, isCustom: true }],
    }));
    onPick(id);
    onClose();
  };

  return (
    <Sheet title="Add exercise" open={open} onClose={onClose} tall>
      {adding ? (
        <div className="space-y-4">
          <Field label="Name">
            <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          </Field>
          <Field label="Muscle group">
            <div className="grid grid-cols-3 gap-2">
              {MUSCLE_GROUPS.map((g) => (
                <button key={g} onClick={() => setNewGroup(g)} className={`rounded-xl border px-2 py-2 text-[13px] capitalize ${newGroup === g ? "border-accent/70 bg-accent/10 text-accent" : "border-line bg-card2 text-muted"}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Equipment">
            <div className="grid grid-cols-3 gap-2">
              {(["barbell", "dumbbell", "machine", "cable", "bodyweight"] as const).map((g) => (
                <button key={g} onClick={() => setNewEquip(g)} className={`rounded-xl border px-2 py-2 text-[13px] capitalize ${newEquip === g ? "border-accent/70 bg-accent/10 text-accent" : "border-line bg-card2 text-muted"}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <PrimaryButton onClick={addCustom} disabled={!newName.trim()}>
            Add to library
          </PrimaryButton>
          <button className="w-full py-2 text-[13px] text-muted" onClick={() => setAdding(false)}>
            Back to library
          </button>
        </div>
      ) : (
        <div className="flex h-full flex-col gap-3">
          <input className={inputCls} placeholder="Search exercises…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Chip active={!group} onClick={() => setGroup(null)}>
              All
            </Chip>
            {MUSCLE_GROUPS.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
                <span className="capitalize">{g}</span>
              </Chip>
            ))}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {list.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onPick(e.id);
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left active:bg-card2"
              >
                <span className="text-[15px] text-cream">
                  {e.name}
                  {e.isCustom && <span className="ml-2 font-mono text-[10px] uppercase text-gold">custom</span>}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {e.muscleGroup} · {e.equipment}
                </span>
              </button>
            ))}
            <button onClick={() => setAdding(true)} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-[14px] text-accent">
              <PlusIcon size={16} /> Create custom exercise
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export function WorkoutSheet({
  open,
  onClose,
  edit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  edit?: Workout;
  onSaved?: (msg: string) => void;
}) {
  const { data, update } = useStore();
  const [name, setName] = useState("Push A");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [exs, setExs] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const savedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    savedRef.current = false;
    setName(edit?.name ?? "Push A");
    setDate(edit?.date ?? todayISO());
    setNotes(edit?.notes ?? "");
    setExs(
      edit
        ? edit.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            sets: e.sets.map((s) => ({ reps: String(s.reps), weight: String(s.weightKg), isWarmup: s.isWarmup, isFailure: s.isFailure, done: true })),
          }))
        : []
    );
    setRestUntil(null);
  }, [open, edit]);

  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;

  const setSet = (ei: number, si: number, patch: Partial<DraftSet>) =>
    setExs((xs) => xs.map((x, i) => (i === ei ? { ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : x)));

  const valid = exs.length > 0 && exs.every((x) => x.sets.some((s) => parseFloat(s.reps) > 0));

  const save = () => {
    if (!valid || savedRef.current) return;
    savedRef.current = true;
    const workout: Workout = {
      id: edit?.id ?? uid(),
      userId: data.currentUserId,
      date,
      time: edit?.time ?? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`,
      name: name.trim() || "Workout",
      notes: notes || undefined,
      exercises: exs
        .map((x) => ({
          exerciseId: x.exerciseId,
          sets: x.sets
            .filter((s) => parseFloat(s.reps) > 0)
            .map((s) => ({ reps: parseFloat(s.reps), weightKg: parseFloat(s.weight) || 0, isWarmup: s.isWarmup || undefined, isFailure: s.isFailure || undefined })),
        }))
        .filter((x) => x.sets.length),
    };
    update((d) => {
      const next = { ...d, workouts: edit ? d.workouts.map((w) => (w.id === edit.id ? workout : w)) : [...d.workouts, workout] };
      const prCount = derivePRs(next).filter((p) => p.workoutId === workout.id).length;
      onSaved?.(prCount > 0 ? `Session saved — ${prCount} new PR${prCount > 1 ? "s" : ""} 🏆` : "Session saved");
      return next;
    });
    onClose();
  };

  return (
    <>
      <Sheet title={edit ? "Edit workout" : "Log workout"} open={open} onClose={onClose} tall>
        <div className="space-y-5 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {SESSION_NAMES.map((n) => (
              <Chip key={n} active={name === n} onClick={() => setName(n)}>
                {n}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Session name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Date">
              <input className={inputCls} type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {exs.map((x, ei) => {
            const prev = previousPerformance(data, data.currentUserId, x.exerciseId, date);
            const prevTop = prev ? Math.max(...prev.sets.map((s) => s.weightKg)) : null;
            return (
              <div key={ei} className="rounded-2xl border border-line bg-card2/60 p-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[15px] font-semibold text-cream">{exName(x.exerciseId)}</div>
                  <button onClick={() => setExs((xs) => xs.filter((_, i) => i !== ei))} className="p-1 text-faint" aria-label="Remove exercise">
                    <XIcon size={15} />
                  </button>
                </div>
                {prev && (
                  <div className="mb-3 font-mono text-[11px] text-faint">
                    Last · {shortDate(prev.date)}: {prev.sets.filter((s) => !s.isWarmup).map((s) => `${s.reps}×${s.weightKg}`).join(", ")} kg
                  </div>
                )}
                <div className="mb-1 grid grid-cols-[28px_1fr_1fr_1fr_34px] items-center gap-2">
                  {["SET", "PREV", "KG", "REPS", ""].map((h, i) => (
                    <SectionLabel key={i} className="!text-[9px] text-center">
                      {h}
                    </SectionLabel>
                  ))}
                </div>
                {x.sets.map((s, si) => (
                  <div key={si} className="mb-2 grid grid-cols-[28px_1fr_1fr_1fr_34px] items-center gap-2">
                    <button
                      onClick={() => setSet(ei, si, { isWarmup: !s.isWarmup })}
                      className={`h-8 rounded-lg font-mono text-[12px] ${s.isWarmup ? "bg-gold/20 text-gold" : "bg-card text-muted"}`}
                      title="Tap to toggle warm-up"
                    >
                      {s.isWarmup ? "W" : si + 1}
                    </button>
                    <div className="text-center font-mono text-[12px] text-faint">{prevTop ? `${prevTop} kg` : "—"}</div>
                    <input className="h-8 w-full min-w-0 rounded-lg border border-line bg-card px-2 text-center font-mono text-[13px] text-cream outline-none focus:border-accent/60" type="number" inputMode="decimal" value={s.weight} onChange={(e) => setSet(ei, si, { weight: e.target.value })} />
                    <input className="h-8 w-full min-w-0 rounded-lg border border-line bg-card px-2 text-center font-mono text-[13px] text-cream outline-none focus:border-accent/60" type="number" inputMode="numeric" value={s.reps} onChange={(e) => setSet(ei, si, { reps: e.target.value })} />
                    <button
                      onClick={() => {
                        if (!s.done && parseFloat(s.reps) > 0) setRestUntil(Date.now() + REST_SECONDS * 1000);
                        setSet(ei, si, { done: !s.done });
                      }}
                      className={`flex h-8 items-center justify-center rounded-lg ${s.done ? "bg-sage/20 text-sage" : "bg-card text-faint"}`}
                      aria-label="Log set (starts rest timer)"
                    >
                      <CheckCircleIcon size={17} />
                    </button>
                  </div>
                ))}
                <div className="mt-1 flex gap-3">
                  <button
                    onClick={() =>
                      setExs((xs) =>
                        xs.map((xx, i) => {
                          if (i !== ei) return xx;
                          const last = xx.sets[xx.sets.length - 1] ?? { reps: "", weight: "" };
                          return { ...xx, sets: [...xx.sets, { ...last, done: false }] };
                        })
                      )
                    }
                    className="flex items-center gap-1 text-[13px] text-accent"
                  >
                    <PlusIcon size={14} /> Add set
                  </button>
                  {x.sets.length > 1 && (
                    <button onClick={() => setExs((xs) => xs.map((xx, i) => (i === ei ? { ...xx, sets: xx.sets.slice(0, -1) } : xx)))} className="text-[13px] text-faint">
                      Remove set
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button onClick={() => setPickerOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-[14px] text-accent">
            <PlusIcon size={16} /> Add exercise
          </button>

          <Field label="Session notes (optional)">
            <input className={inputCls} value={notes} placeholder="Energy, soreness, RPE…" onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <PrimaryButton onClick={save} disabled={!valid}>
            {edit ? "Save changes" : "Finish workout"}
          </PrimaryButton>
        </div>
      </Sheet>
      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => setExs((xs) => [...xs, { exerciseId: id, sets: [{ reps: "", weight: "" }, { reps: "", weight: "" }, { reps: "", weight: "" }] }])}
      />
      {restUntil && <RestTimer until={restUntil} onDismiss={() => setRestUntil(null)} />}
    </>
  );
}
