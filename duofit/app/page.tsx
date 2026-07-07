"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  adherencePct,
  derivePRs,
  dietWeek,
  sessionsThisWeek,
  userMeasurements,
  userWeights,
  weeklySeries,
} from "@/lib/derive";
import { addDays, friendlyDate, greeting, headerDate, kg, signed, todayISO, uid } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { Legend, LineChart, Sparkline } from "@/components/charts";
import { Avatar, Card, SectionLabel } from "@/components/ui";
import { CheckCircleIcon, ChevronRight, HeartIcon, ScaleIcon } from "@/components/icons";
import { DietSheet, WeightSheet } from "@/components/sheets";

function PersonCard({ p }: { p: Profile }) {
  const { data } = useStore();
  const weights = userWeights(data, p.id);
  const latest = weights[weights.length - 1];
  const first = weights[0];
  const delta = latest && first ? latest.weightKg - first.weightKg : 0;
  const bf = userMeasurements(data, p.id).slice(-1)[0]?.bfPercent;
  const week = dietWeek(data, p.id);

  return (
    <Card className="flex-1 p-4">
      <div className="mb-4 flex items-center gap-2.5">
        <Avatar name={p.name} tint={p.tint} size={30} />
        <span className="text-[16px] font-semibold text-cream">{p.name}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <SectionLabel className="!tracking-normal !normal-case !text-[12px] !font-sans">Weight</SectionLabel>
        <span className="font-mono text-[12px]" style={{ color: p.tint }}>
          {signed(delta)} kg
        </span>
      </div>
      <div className="mt-1 font-mono text-[26px] font-bold text-cream">
        {latest ? kg(latest.weightKg) : "—"} <span className="text-[13px] font-medium text-muted">kg</span>
      </div>
      <div className="mt-2">
        <Sparkline points={weights.map((w) => w.weightKg)} color={p.series} />
      </div>
      <div className="mt-3 flex justify-between">
        <div>
          <div className="text-[12px] text-muted">Body Fat</div>
          <div className="font-mono text-[17px] font-bold text-cream">
            {bf ?? "—"} <span className="text-[11px] font-medium text-muted">%</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] text-muted">Sessions</div>
          <div className="font-mono text-[17px] font-bold text-cream">
            {sessionsThisWeek(data, p.id)} <span className="text-[11px] font-medium text-muted">/wk</span>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-2 text-[12px] text-muted">Diet this week</div>
        <div className="flex gap-1.5">
          {week.map(({ date, status }) => (
            <span
              key={date}
              className="h-[18px] w-[18px] rounded-full"
              style={{
                background: status === "yes" ? p.tint : status === "partial" ? `${p.tint}66` : "var(--color-card2)",
                border: status ? "none" : "1px solid var(--color-line)",
                opacity: status === "no" ? 0.35 : 1,
              }}
              title={`${date}: ${status ?? "not logged"}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default function HomePage() {
  const { data, update } = useStore();
  const today = todayISO();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const partner = data.profiles.find((p) => p.id !== data.currentUserId)!;

  const [weightOpen, setWeightOpen] = useState(false);
  const [dietOpen, setDietOpen] = useState(false);

  const trend = useMemo(() => {
    const labels = Array.from({ length: 8 }, (_, i) => `W${i + 1}`);
    const series = data.profiles.map((p) => ({
      name: p.name,
      color: p.series,
      points: weeklySeries(userWeights(data, p.id).map((w) => ({ date: w.date, value: w.weightKg })), 8),
    }));
    return { labels, series };
  }, [data]);

  const myWeights = userWeights(data, data.currentUserId);
  const lastWeight = myWeights[myWeights.length - 1];
  const weightLoggedToday = lastWeight?.date === today;
  const dietLoggedToday = data.adherence.some((a) => a.userId === data.currentUserId && a.date === today);

  const partnerLoggedToday =
    data.workouts.some((w) => w.userId === partner.id && w.date === today) ||
    data.weights.some((w) => w.userId === partner.id && w.date === today) ||
    data.adherence.some((a) => a.userId === partner.id && a.date === today);
  const nudgedToday = data.nudges.some((n) => n.fromUser === me.id && n.toUser === partner.id && n.createdAt.startsWith(today));

  const weeklyWin = useMemo(() => {
    const cutoff = addDays(today, -6);
    const pr = derivePRs(data).find((p) => p.date >= cutoff);
    if (pr) {
      const who = data.profiles.find((p) => p.id === pr.userId)!.name;
      const ex = data.exercises.find((e) => e.id === pr.exerciseId)?.name ?? "";
      return `${who}'s ${pr.value} kg ${ex} ${pr.type === "max_volume" ? "volume " : ""}PR 🏆`;
    }
    return null;
  }, [data, today]);

  const sendLove = () => {
    if (nudgedToday) return;
    update((d) => ({ ...d, nudges: [...d.nudges, { id: uid(), fromUser: me.id, toUser: partner.id, createdAt: new Date().toISOString() }] }));
  };

  return (
    <div>
      <SectionLabel>{headerDate(today)}</SectionLabel>
      <div className="mt-1 flex items-start justify-between">
        <h1 className="font-serif text-[36px] leading-tight text-cream">
          {greeting().slice(0, -1)}
          <span className="text-accent">.</span>
        </h1>
        <button
          onClick={sendLove}
          aria-label={`Send some love to ${partner.name}`}
          className={`mt-1 rounded-full border border-line bg-card p-3 ${nudgedToday ? "text-accent" : "text-accent/80"}`}
        >
          <HeartIcon size={19} fill={nudgedToday ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-5 flex gap-3">
        {data.profiles.map((p) => (
          <PersonCard key={p.id} p={p} />
        ))}
      </div>

      <Card className="mt-4 p-4">
        <SectionLabel className="mb-3">8-Week Weight Trend</SectionLabel>
        <LineChart series={trend.series} labels={trend.labels} unit=" kg" />
        <Legend series={trend.series} />
      </Card>

      <SectionLabel className="mb-3 mt-7">Today&apos;s Prompts</SectionLabel>
      <div className="space-y-3">
        {!weightLoggedToday && (
          <Card onClick={() => setWeightOpen(true)} className="flex items-center gap-4 !border-accent/25 !bg-accent/5 p-4">
            <span className="rounded-full bg-accent/15 p-2.5 text-accent">
              <ScaleIcon size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-cream">Log morning weight</span>
              <span className="block text-[13px] text-muted">
                {lastWeight ? `Last: ${kg(lastWeight.weightKg)} kg · ${friendlyDate(lastWeight.date).toLowerCase()}` : "No entries yet"}
              </span>
            </span>
            <ChevronRight size={18} className="text-faint" />
          </Card>
        )}
        {!dietLoggedToday && (
          <Card onClick={() => setDietOpen(true)} className="flex items-center gap-4 p-4">
            <span className="rounded-full bg-sage/15 p-2.5 text-sage">
              <CheckCircleIcon size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-cream">Diet adherence check</span>
              <span className="block text-[13px] text-muted">Did you stick to your plan today?</span>
            </span>
            <ChevronRight size={18} className="text-faint" />
          </Card>
        )}
        {!partnerLoggedToday && (
          <Card onClick={sendLove} className="flex items-center gap-4 p-4">
            <span className="rounded-full p-2.5" style={{ background: `${partner.tint}20`, color: partner.tint }}>
              <HeartIcon size={20} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-cream">
                {nudgedToday ? `Nudged ${partner.name} ✓` : `Nudge ${partner.name}`}
              </span>
              <span className="block text-[13px] text-muted">
                {nudgedToday ? "A gentle prompt is on its way" : `${partner.name} hasn't logged anything today`}
              </span>
            </span>
            {!nudgedToday && <ChevronRight size={18} className="text-faint" />}
          </Card>
        )}
        {weightLoggedToday && dietLoggedToday && (
          <Card className="p-4 text-center text-[13px] text-muted">All caught up for today ✓</Card>
        )}
      </div>

      <SectionLabel className="mb-3 mt-7">This Week Together</SectionLabel>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          {data.profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <Avatar name={p.name} tint={p.tint} size={26} />
              <div>
                <div className="font-mono text-[15px] font-bold text-cream">{sessionsThisWeek(data, p.id)} sessions</div>
                <div className="text-[11px] text-faint">{adherencePct(data, p.id, 7)}% adherence</div>
              </div>
            </div>
          ))}
        </div>
        {weeklyWin && (
          <div className="mt-4 rounded-xl bg-card2 px-3.5 py-3 text-[13px] text-cream">
            <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-gold">Win of the week</span>
            {weeklyWin}
          </div>
        )}
      </Card>

      <WeightSheet open={weightOpen} onClose={() => setWeightOpen(false)} />
      <DietSheet open={dietOpen} onClose={() => setDietOpen(false)} />
    </div>
  );
}
