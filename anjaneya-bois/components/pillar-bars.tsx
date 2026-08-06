import { PILLAR_CAPS } from "@/lib/score";
import type { PillarPoints } from "@/lib/types";

const PILLARS = [
  { key: "sleep_pts", label: "Sleep", cap: PILLAR_CAPS.sleep },
  { key: "steps_pts", label: "Steps", cap: PILLAR_CAPS.steps },
  { key: "exercise_pts", label: "Exercise", cap: PILLAR_CAPS.exercise },
  { key: "recovery_pts", label: "Recovery", cap: PILLAR_CAPS.recovery },
] as const;

export default function PillarBars({ points, color }: { points: PillarPoints; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      {PILLARS.map((p) => {
        const restDropped = points.is_rest_day && p.key === "exercise_pts";
        const earned = points[p.key];
        const pct = restDropped ? 0 : Math.min((earned / p.cap) * 100, 100);
        return (
          <div key={p.key} className="flex items-center gap-2">
            <span className="w-20 text-xs font-medium" style={{ color: "var(--ink-2)" }}>
              {p.label}
            </span>
            <div className="pill-track flex-1">
              <div className="pill-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="w-14 text-right text-xs tabular-nums" style={{ color: "var(--ink-2)" }}>
              {restDropped ? "rest" : `${earned}/${p.cap}`}
            </span>
          </div>
        );
      })}
      {points.calorie_bonus > 0 && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          +{points.calorie_bonus} calorie flex bonus
        </p>
      )}
    </div>
  );
}
