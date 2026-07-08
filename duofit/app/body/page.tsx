"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { userMeasurements, userWeights, weeklySeries } from "@/lib/derive";
import { kg, shortDate, signed } from "@/lib/format";
import { LineChart } from "@/components/charts";
import { Card, PrimaryButton, SectionLabel } from "@/components/ui";
import { MeasurementSheet, PhotoSheet } from "@/components/sheets";

const ROWS = [
  ["neck", "Neck"],
  ["chest", "Chest"],
  ["waist", "Waist"],
  ["hips", "Hips"],
  ["arms", "Arms (L/R)"],
  ["thighs", "Thighs"],
] as const;

export default function BodyPage() {
  const { data } = useStore();
  const me = data.profiles.find((p) => p.id === data.currentUserId)!;
  const ms = userMeasurements(data, me.id);
  const latest = ms[ms.length - 1];
  const first = ms[0];
  const weights = userWeights(data, me.id);
  const latestW = weights[weights.length - 1];
  const firstW = weights[0];

  const [measureOpen, setMeasureOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [compare, setCompare] = useState<[string | null, string | null]>([null, null]);

  const leanMass = latest && latestW ? latestW.weightKg * (1 - latest.bfPercent / 100) : null;
  const leanStart = first && firstW ? firstW.weightKg * (1 - first.bfPercent / 100) : null;

  const bfSeries = useMemo(
    () => weeklySeries(ms.map((m) => ({ date: m.date, value: m.bfPercent })), 8),
    [ms]
  );

  const myPhotos = data.photos.filter((p) => p.userId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const photoDates = [...new Set(myPhotos.map((p) => p.date))];
  const photoAt = (date: string | null) => (date ? myPhotos.find((p) => p.date === date) : undefined);

  const delta = (key: "neck" | "chest" | "waist" | "hips" | "thighs") =>
    latest && first ? latest[key] - first[key] : 0;

  return (
    <div>
      <SectionLabel>{me.name}&apos;s composition</SectionLabel>
      <h1 className="mt-1 font-serif text-[36px] leading-tight text-cream">
        Body<span className="text-accent">.</span>
      </h1>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <SectionLabel className="mb-2 !text-[10px]">Weight</SectionLabel>
          <div className="font-mono text-[24px] font-bold text-cream">
            {latestW ? kg(latestW.weightKg) : "—"} <span className="text-[12px] font-medium text-muted">kg</span>
          </div>
          <div className="mt-1.5 text-[12px] text-sage">{latestW && firstW ? `${signed(latestW.weightKg - firstW.weightKg)} kg from start` : ""}</div>
        </Card>
        <Card className="p-4">
          <SectionLabel className="mb-2 !text-[10px]">Body Fat %</SectionLabel>
          <div className="font-mono text-[24px] font-bold text-cream">
            {latest?.bfPercent ?? "—"} <span className="text-[12px] font-medium text-muted">%</span>
          </div>
          <div className="mt-1.5 text-[12px] text-sage">{latest && first ? `${signed(latest.bfPercent - first.bfPercent)} from start` : ""}</div>
        </Card>
        <Card className="p-4">
          <SectionLabel className="mb-2 !text-[10px]">Waist</SectionLabel>
          <div className="font-mono text-[24px] font-bold text-cream">
            {latest?.waist ?? "—"} <span className="text-[12px] font-medium text-muted">cm</span>
          </div>
          <div className="mt-1.5 text-[12px] text-sage">{latest && first ? `${signed(delta("waist"), 0)} cm from start` : ""}</div>
        </Card>
        <Card className="p-4">
          <SectionLabel className="mb-2 !text-[10px]">Lean Mass (est.)</SectionLabel>
          <div className="font-mono text-[24px] font-bold text-cream">
            {leanMass ? kg(Math.round(leanMass * 10) / 10) : "—"} <span className="text-[12px] font-medium text-muted">kg</span>
          </div>
          <div className="mt-1.5 text-[12px] text-sage">{leanMass && leanStart ? `${signed(Math.round((leanMass - leanStart) * 10) / 10)} kg from start` : ""}</div>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <SectionLabel className="mb-3">Body Fat % — 8 Weeks</SectionLabel>
        <LineChart
          series={[{ name: "Body fat %", color: me.series, points: bfSeries }]}
          labels={Array.from({ length: 8 }, (_, i) => `W${i + 1}`)}
          unit="%"
          height={150}
        />
      </Card>

      {latest && (
        <Card className="mt-4 p-4">
          <SectionLabel className="mb-4">Measurements · {shortDate(latest.date)}</SectionLabel>
          <div className="divide-y divide-line">
            {ROWS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between py-3">
                <span className="text-[14px] text-muted">{label}</span>
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-[12px] text-sage">
                    {key === "arms"
                      ? signed(first ? latest.armL - first.armL : 0, 1) + " cm"
                      : signed(delta(key), 1) + " cm"}
                  </span>
                  <span className="font-mono text-[17px] font-bold text-cream">
                    {key === "arms" ? `${latest.armL} / ${latest.armR}` : latest[key]} <span className="text-[11px] font-medium text-muted">cm</span>
                  </span>
                </span>
              </div>
            ))}
          </div>
          <PrimaryButton className="mt-4" onClick={() => setMeasureOpen(true)}>
            Log measurements
          </PrimaryButton>
        </Card>
      )}

      <Card className="mt-4 bg-card2/50 p-4">
        <p className="text-[13px] leading-relaxed text-muted">
          Body fat % calculated via the <span className="font-semibold text-cream">US Navy Method</span> using neck, waist,
          {me.sex === "female" ? " hip," : ""} and height measurements. Auto-computed on each log.
        </p>
      </Card>

      <SectionLabel className="mb-3 mt-7">Progress Photos</SectionLabel>
      {myPhotos.length === 0 ? (
        <Card className="p-5 text-center">
          <p className="text-[13px] text-muted">No photos yet. Weekly front / side / back shots make the change visible.</p>
          <button onClick={() => setPhotoOpen(true)} className="mt-3 text-[14px] font-semibold text-accent">
            Add first photo
          </button>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {myPhotos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.dataUrl} alt={p.angle} className="h-28 w-20 shrink-0 rounded-xl object-cover" onClick={() => setCompare((c) => (c[0] ? [c[0], p.date] : [p.date, null]))} />
            ))}
          </div>
          {photoDates.length >= 2 && (
            <Card className="mt-3 p-4">
              <SectionLabel className="mb-3">Compare</SectionLabel>
              <div className="mb-3 grid grid-cols-2 gap-3">
                {[0, 1].map((i) => (
                  <select
                    key={i}
                    className="rounded-xl border border-line bg-card2 px-3 py-2.5 text-[13px] text-cream"
                    value={compare[i] ?? ""}
                    onChange={(e) => setCompare((c) => (i === 0 ? [e.target.value || null, c[1]] : [c[0], e.target.value || null]))}
                  >
                    <option value="">{i === 0 ? "Before…" : "After…"}</option>
                    {photoDates.map((d) => (
                      <option key={d} value={d}>
                        {shortDate(d)}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
              {compare[0] && compare[1] && (
                <div className="grid grid-cols-2 gap-3">
                  {[photoAt(compare[0]), photoAt(compare[1])].map((p, i) =>
                    p ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={p.dataUrl} alt={p.angle} className="w-full rounded-xl object-cover" />
                    ) : (
                      <div key={i} className="rounded-xl bg-card2 py-10 text-center text-[12px] text-faint">
                        No photo
                      </div>
                    )
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      <MeasurementSheet open={measureOpen} onClose={() => setMeasureOpen(false)} />
      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} />
    </div>
  );
}
