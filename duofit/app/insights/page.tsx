"use client";

import React, { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  adherencePct,
  derivePRs,
  totalSessions,
  userWeights,
  weeklySeries,
} from "@/lib/derive";
import { addDays, friendlyDate, fromISO, shortDate, todayISO, weekOf } from "@/lib/format";
import { Legend, LineChart, WeekBars } from "@/components/charts";
import { Avatar, Card, ProgressBar, SectionLabel, StatTile } from "@/components/ui";
import { TrophyIcon } from "@/components/icons";

const PR_LABEL: Record<string, string> = {
  max_weight: "heaviest set",
  est_1rm: "est. 1RM",
  max_volume: "session volume",
};

export default function InsightsPage() {
  const { data } = useStore();
  const today = todayISO();
  const shared = data.programs.find((p) => p.scope === "shared")!;
  const weeksIn = weekOf(shared, today);

  const avgAdherence = Math.round(
    data.profiles.reduce((acc, p) => acc + adherencePct(data, p.id, 56), 0) / data.profiles.length
  );

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)), [today]);
  const DAY_ABBR = ["Su", "Mo", "Tu", "W", "Th", "F", "Sa"];
  const dayLabels = weekDays.map((d) => DAY_ABBR[fromISO(d).getDay()]);

  const dietWeekSeries = useMemo(() => {
    const score = { yes: 1, partial: 0.5, no: 0 } as const;
    return data.profiles.map((p) => ({
      name: p.name,
      color: p.series,
      scores: weekDays.map((date) => {
        const log = data.adherence.find((a) => a.userId === p.id && a.date === date);
        return log ? score[log.status] : null;
      }),
    }));
  }, [data, weekDays]);

  const dietCounts = data.profiles.map((p) => {
    const days = weekDays.filter((d) => d < today);
    const yes = days.filter((d) => data.adherence.some((a) => a.userId === p.id && a.date === d && a.status === "yes")).length;
    return { name: p.name, color: p.series, label: `${p.name} — ${yes}/${days.length} days` };
  });

  const trend = useMemo(
    () => ({
      labels: Array.from({ length: 8 }, (_, i) => `W${i + 1}`),
      series: data.profiles.map((p) => ({
        name: p.name,
        color: p.series,
        points: weeklySeries(userWeights(data, p.id).map((w) => ({ date: w.date, value: w.weightKg })), 8),
      })),
    }),
    [data]
  );

  const prs = useMemo(() => derivePRs(data).slice(0, 8), [data]);
  const exName = (id: string) => data.exercises.find((e) => e.id === id)?.name ?? id;

  return (
    <div>
      <SectionLabel>{weeksIn} weeks in</SectionLabel>
      <h1 className="mt-1 font-serif text-[36px] leading-tight text-cream">
        Insights<span className="text-accent">.</span>
      </h1>

      <div className="mt-5 flex gap-3">
        <StatTile label="C Sessions" value={String(totalSessions(data, "christopher"))} sub="total logged" />
        <StatTile label="M Sessions" value={String(totalSessions(data, "mahak"))} sub="total logged" />
        <StatTile label="Avg Adherence" value={`${avgAdherence}%`} sub={`both · ${weeksIn} wks`} />
      </div>

      <Card className="mt-4 p-4">
        <SectionLabel className="mb-3">Diet Adherence — Last 7 Days</SectionLabel>
        <WeekBars series={dietWeekSeries} days={dayLabels} />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {dietCounts.map((c) => (
            <span key={c.name} className="flex items-center gap-2 text-[13px] text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <SectionLabel className="mb-3">Weight Trend — 8 Weeks</SectionLabel>
        <LineChart series={trend.series} labels={trend.labels} unit=" kg" />
        <Legend series={trend.series} />
      </Card>

      <SectionLabel className="mb-3 mt-7">Program Blocks</SectionLabel>
      <div className="space-y-3">
        {data.programs.map((prog) => {
          const w = weekOf(prog, today);
          const pct = Math.round((w / prog.weeks) * 100);
          const owner = prog.userId ? data.profiles.find((p) => p.id === prog.userId) : null;
          return (
            <Card key={prog.id} className="p-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-2 text-[16px] font-semibold text-cream">
                  {owner && <Avatar name={owner.name} tint={owner.tint} size={20} />}
                  {prog.name}
                </span>
                <span className="font-mono text-[13px] font-bold text-gold">
                  W{w}/{prog.weeks}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar pct={pct} color={owner ? owner.tint : "var(--color-gold)"} />
              </div>
              <div className="mt-2.5 flex justify-between text-[12px] text-muted">
                <span>{shortDate(prog.startDate)}</span>
                <span>{pct}% complete</span>
                <span>{shortDate(addDays(prog.startDate, prog.weeks * 7))}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionLabel className="mb-3 mt-7">PR Feed</SectionLabel>
      <div className="space-y-3">
        {prs.map((pr, i) => {
          const who = data.profiles.find((p) => p.id === pr.userId)!;
          return (
            <Card key={i} className="flex items-center gap-4 p-4">
              <span className="rounded-full p-2.5" style={{ background: `${who.tint}1f`, color: who.tint }}>
                <TrophyIcon size={19} />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-cream">
                  {exName(pr.exerciseId)} · {pr.value.toLocaleString("en-US")} kg
                </span>
                <span className="block text-[12px] text-muted">
                  {who.name} · new {PR_LABEL[pr.type]} · {friendlyDate(pr.date)}
                </span>
              </span>
            </Card>
          );
        })}
        {prs.length === 0 && <Card className="p-5 text-center text-[13px] text-muted">No PRs yet — they&apos;ll show up as loads climb.</Card>}
      </div>
    </div>
  );
}
