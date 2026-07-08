"use client";

import React, { useId, useMemo, useRef, useState } from "react";

/* Palette note: series colors are validated for the dark surface (#211b12):
   Christopher #d96a35, Mahak #63a56d — CVD ΔE 19.4, contrast ≥ 3:1.
   Identity is never color-alone: every multi-series chart renders a legend. */

export interface Series {
  name: string;
  color: string;
  points: (number | null)[];
}

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step;
  const mult = err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const s = mult * step;
  const lo = Math.floor(min / s) * s;
  const hi = Math.ceil(max / s) * s;
  const out: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += s) out.push(Math.round(v * 100) / 100);
  return out;
}

export function Legend({ series }: { series: { name: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
      {series.map((s) => (
        <span key={s.name} className="flex items-center gap-2 text-[13px] text-muted">
          <span className="h-[3px] w-5 rounded-full" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

/** Multi-series line/area chart with crosshair + tooltip. */
export function LineChart({
  series,
  labels,
  height = 170,
  unit = "",
  showDots = false,
  fill = true,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  unit?: string;
  showDots?: boolean;
  fill?: boolean;
}) {
  const gid = useId().replace(/[:]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 340;
  const H = height;
  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 22;

  const { ticks, yOf, xOf } = useMemo(() => {
    const vals = series.flatMap((s) => s.points.filter((p): p is number => p !== null));
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 1;
    const t = niceTicks(min - pad, max + pad);
    const lo = t[0];
    const hi = t[t.length - 1];
    return {
      ticks: t,
      yOf: (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB),
      xOf: (i: number) => padL + (i / Math.max(1, labels.length - 1)) * (W - padL - padR),
    };
  }, [series, labels.length, H]);

  const pathOf = (pts: (number | null)[]) => {
    let dLine = "";
    pts.forEach((p, i) => {
      if (p === null) return;
      dLine += `${dLine ? "L" : "M"}${xOf(i).toFixed(1)},${yOf(p).toFixed(1)}`;
    });
    return dLine;
  };

  const areaOf = (pts: (number | null)[]) => {
    const line = pathOf(pts);
    if (!line) return "";
    const idxs = pts.map((p, i) => (p === null ? -1 : i)).filter((i) => i >= 0);
    const last = idxs[idxs.length - 1];
    const first = idxs[0];
    const bottom = H - padB;
    return `${line}L${xOf(last).toFixed(1)},${bottom}L${xOf(first).toFixed(1)},${bottom}Z`;
  };

  const onMove = (e: React.PointerEvent) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((x - padL) / (W - padL - padR)) * (labels.length - 1));
    setHover(Math.min(labels.length - 1, Math.max(0, i)));
  };

  return (
    <div ref={wrapRef} className="relative" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${gid}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={yOf(t)} y2={yOf(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={padL - 6} y={yOf(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-faint)" fontFamily="var(--font-mono)">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-mono)">
            {l}
          </text>
        ))}
        {fill && series.map((s, si) => <path key={`a${si}`} d={areaOf(s.points)} fill={`url(#${gid}-${si})`} />)}
        {series.map((s, si) => (
          <path key={`l${si}`} d={pathOf(s.points)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {showDots &&
          series.map((s, si) =>
            s.points.map((p, i) =>
              p === null ? null : <circle key={`${si}-${i}`} cx={xOf(i)} cy={yOf(p)} r="3.5" fill={s.color} stroke="var(--color-card)" strokeWidth="2" />
            )
          )}
        {hover !== null && (
          <g>
            <line x1={xOf(hover)} x2={xOf(hover)} y1={padT} y2={H - padB} stroke="var(--color-faint)" strokeWidth="1" strokeDasharray="3 3" />
            {series.map((s, si) =>
              s.points[hover] === null ? null : (
                <circle key={si} cx={xOf(hover)} cy={yOf(s.points[hover] as number)} r="4" fill={s.color} stroke="var(--color-card)" strokeWidth="2" />
              )
            )}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-card2 px-3 py-2 shadow-lg"
          style={{ left: `${(xOf(hover) / W) * 100}%` }}
        >
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-faint">{labels[hover]}</div>
          {series.map(
            (s) =>
              s.points[hover] !== null && (
                <div key={s.name} className="flex items-center gap-2 whitespace-nowrap font-mono text-[12px] text-cream">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {(s.points[hover] as number).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                  {unit}
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}

/** Tiny single-series area sparkline for the person cards. */
export function Sparkline({ points, color, height = 44 }: { points: number[]; color: string; height?: number }) {
  const gid = useId().replace(/[:]/g, "");
  const W = 140;
  const H = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / Math.max(1, points.length - 1)) * W;
  const y = (v: number) => 4 + (1 - (v - min) / span) * (H - 10);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W},${H}L0,${H}Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Grouped weekday bars for diet adherence (score 0..1 per day, two series). */
export function WeekBars({
  series,
  days,
}: {
  series: { name: string; color: string; scores: (number | null)[] }[];
  days: string[];
}) {
  const W = 320;
  const H = 130;
  const padB = 20;
  const groupW = W / days.length;
  const barW = 7;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {days.map((d, i) => (
        <text key={d + i} x={groupW * i + groupW / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--color-muted)" fontFamily="var(--font-mono)">
          {d}
        </text>
      ))}
      {series.map((s, si) =>
        s.scores.map((score, i) => {
          const cx = groupW * i + groupW / 2 + (si - (series.length - 1) / 2) * (barW + 3);
          if (score === null || score === 0)
            return <circle key={`${si}-${i}`} cx={cx} cy={H - padB - 3} r="2" fill="var(--color-line)" />;
          const h = Math.max(6, score * (H - padB - 14));
          return (
            <rect
              key={`${si}-${i}`}
              x={cx - barW / 2}
              y={H - padB - h}
              width={barW}
              height={h}
              rx={barW / 2}
              fill={s.color}
              opacity={score < 1 ? 0.5 : 1}
            />
          );
        })
      )}
    </svg>
  );
}
