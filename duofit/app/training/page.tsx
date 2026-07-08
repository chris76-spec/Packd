"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { exerciseProgression, progressionCandidates, userWorkouts, workoutVolume } from "@/lib/derive";
import { formatTime, friendlyDate, shortDate, signed, uid, weekOf, todayISO } from "@/lib/format";
import type { UserId, Workout } from "@/lib/types";
import { LineChart } from "@/components/charts";
import { Avatar, Card, Chip, ProgressBar, SectionLabel, useConfirmDelete } from "@/components/ui";
import { ChevronDown } from "@/components/icons";

function SessionCard({ w, mine }: { w: Workout; mine: boolean }) {
  const { data, update } = useStore();
  const confirmDelete = useConfirmDelete();
  const [openState, setOpen] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const isToday = w.date === todayISO();
  const open = openState ?? (isToday && mine);

  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;
  const comments = data.comments
    .filter((c) => c.targetType === "workout" && c.targetId === w.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const addComment = () => {
    if (!draft.trim()) return;
    update((d) => ({
      ...d,
      comments: [
        ...d.comments,
        { id: uid(), authorId: d.currentUserId, targetType: "workout", targetId: w.id, body: draft.trim(), createdAt: new Date().toISOString() },
      ],
    }));
    setDraft("");
  };

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between p-4 text-left">
        <span>
          <span className="block text-[17px] font-semibold text-cream">{w.name}</span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {friendlyDate(w.date)}
            {w.time ? ` · ${formatTime(w.time)}` : ""}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="rounded-full bg-card2 px-3 py-1.5 font-mono text-[12px] text-cream">
            {workoutVolume(w).toLocaleString("en-US")} kg
          </span>
          <ChevronDown size={17} className={`text-faint transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          <div className="space-y-1.5 font-mono text-[13px] text-muted">
            {w.exercises.map((ex, i) => {
              const work = ex.sets.filter((s) => !s.isWarmup);
              const top = Math.max(0, ...work.map((s) => s.weightKg));
              const reps = work[0]?.reps ?? 0;
              return (
                <div key={i}>
                  {exName(ex.exerciseId)} {work.length}×{reps} @ {top} kg
                </div>
              );
            })}
          </div>
          {w.notes && <div className="mt-3 text-[13px] italic text-faint">“{w.notes}”</div>}

          {(comments.length > 0 || !mine) && (
            <div className="mt-4 space-y-2.5 border-t border-line pt-3">
              {comments.map((c) => {
                const author = data.profiles.find((p) => p.id === c.authorId)!;
                return (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar name={author.name} tint={author.tint} size={22} />
                    <span className="pt-0.5 text-[14px] text-cream">{c.body}</span>
                  </div>
                );
              })}
              {!mine && (
                <div className="flex items-center gap-2">
                  <Avatar name={me.name} tint={me.tint} size={22} />
                  <input
                    className="flex-1 rounded-full border border-line bg-card2 px-3.5 py-2 text-[13px] text-cream outline-none placeholder:text-faint focus:border-accent/60"
                    placeholder={`Cheer on ${w.userId === "christopher" ? "Christopher" : "Mahak"}…`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addComment()}
                  />
                  <button onClick={addComment} disabled={!draft.trim()} className="text-[13px] font-semibold text-accent disabled:opacity-40">
                    Send
                  </button>
                </div>
              )}
            </div>
          )}

          {mine && (
            <button
              onClick={() => {
                if (confirmDelete("workout")) update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== w.id) }));
              }}
              className="mt-3 text-[12px] text-faint underline-offset-2 hover:underline"
            >
              Delete session
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function TrainingPage() {
  const { data } = useStore();
  const today = todayISO();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const partner = data.profiles.find((p) => p.id !== data.currentUserId)!;
  const shared = data.programs.find((p) => p.scope === "shared")!;
  const week = weekOf(shared, today);
  const pct = Math.round((week / shared.weeks) * 100);

  const [view, setView] = useState<UserId>(me.id);
  const viewer = data.profiles.find((p) => p.id === view)!;

  const candidates = progressionCandidates(data, view);
  const [exercise, setExercise] = useState<string | null>(null);
  const activeEx = exercise && candidates.includes(exercise) ? exercise : candidates[0];

  const prog = useMemo(() => (activeEx ? exerciseProgression(data, view, activeEx) : []), [data, view, activeEx]);
  const trimmed = prog.slice(-10);
  const start = trimmed[0]?.top ?? 0;
  const now = trimmed[trimmed.length - 1]?.top ?? 0;

  const sessions = userWorkouts(data, view).slice(0, 14);
  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;

  return (
    <div>
      <SectionLabel>
        Week {week} of {shared.weeks}
      </SectionLabel>
      <h1 className="mt-1 font-serif text-[36px] leading-tight text-cream">
        Training<span className="text-accent">.</span>
      </h1>

      <Card className="mt-5 p-4">
        <div className="flex items-baseline justify-between">
          <SectionLabel>
            Shared Block · Week {week}/{shared.weeks}
          </SectionLabel>
          <span className="font-mono text-[15px] font-bold text-gold">{pct}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar pct={pct} />
        </div>
        <div className="mt-3 flex justify-between text-[12px] text-muted">
          <span>Start: {shortDate(shared.startDate)}</span>
          <span>Target: {shortDate(addWeeks(shared.startDate, shared.weeks))}</span>
        </div>
      </Card>

      <div className="mt-4 flex gap-2">
        {data.profiles.map((p) => (
          <Chip key={p.id} active={view === p.id} onClick={() => setView(p.id)}>
            {p.id === me.id ? "My training" : p.name}
          </Chip>
        ))}
      </div>

      {activeEx && (
        <Card className="mt-4 p-4">
          <SectionLabel className="mb-3">Progressive Overload</SectionLabel>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {candidates.slice(0, 8).map((id) => (
              <Chip key={id} active={id === activeEx} onClick={() => setExercise(id)}>
                {exName(id)}
              </Chip>
            ))}
          </div>
          <LineChart
            series={[{ name: exName(activeEx), color: viewer.series, points: trimmed.map((p) => p.top) }]}
            labels={trimmed.map((_, i) => `S${prog.length - trimmed.length + i + 1}`)}
            unit=" kg"
            showDots
            fill={false}
          />
          <div className="mt-3 flex items-center justify-between text-[12px]">
            <span className="text-muted">Start: {start} kg</span>
            <span className="font-mono" style={{ color: viewer.tint }}>
              {signed(now - start)} kg in {trimmed.length} sessions
            </span>
            <span className="text-muted">Now: {now} kg</span>
          </div>
        </Card>
      )}

      <SectionLabel className="mb-3 mt-7">Session History</SectionLabel>
      <div className="space-y-3">
        {sessions.map((w) => (
          <SessionCard key={w.id} w={w} mine={view === me.id} />
        ))}
        {sessions.length === 0 && <Card className="p-5 text-center text-[13px] text-muted">No sessions yet — log one from the Log tab.</Card>}
      </div>
      {view !== me.id && (
        <p className="mt-4 text-center text-[12px] text-faint">You&apos;re viewing {partner.name}&apos;s training — leave a comment to cheer them on.</p>
      )}
    </div>
  );
}

function addWeeks(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + weeks * 7);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}
