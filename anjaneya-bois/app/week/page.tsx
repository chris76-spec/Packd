// Week — weekly league totals, shared-goal progress bar, day-by-day scores
// for both users (PRD §7.2). Grouped thin bars, per-user color, 2px gaps.

import { redirect } from "next/navigation";
import { getViewer, weekData } from "@/lib/queries";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function WeekPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { me, rival, matchup } = viewer;

  const week = await weekData(matchup);
  const totalA = week.weekly?.user_a_total ?? sumOf(week.scores[matchup.user_a]);
  const totalB = week.weekly?.user_b_total ?? sumOf(week.scores[matchup.user_b]);
  const goalTarget = week.weekly?.shared_goal_target ?? 910;
  const goalProgress = week.weekly?.shared_goal_progress ?? totalA + totalB;
  const goalPct = Math.min((goalProgress / goalTarget) * 100, 100);

  const meIsA = matchup.user_a === me.id;
  const nameA = meIsA ? me.name : rival.name;
  const nameB = meIsA ? rival.name : me.name;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">This Week</h1>

      <section className="card flex justify-around text-center">
        <div>
          <p className="text-3xl font-extrabold tabular-nums" style={{ color: "var(--user-a)" }}>{totalA}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>{nameA}</p>
        </div>
        <div className="self-center text-sm" style={{ color: "var(--ink-3)" }}>vs</div>
        <div>
          <p className="text-3xl font-extrabold tabular-nums" style={{ color: "var(--user-b)" }}>{totalB}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>{nameB}</p>
        </div>
      </section>

      <section className="card">
        <div className="mb-1 flex justify-between text-xs" style={{ color: "var(--ink-2)" }}>
          <span>Shared goal — both win or both miss</span>
          <span className="tabular-nums">{goalProgress} / {goalTarget}</span>
        </div>
        <div className="pill-track">
          <div
            className="pill-fill"
            style={{ width: `${goalPct}%`, background: week.weekly?.shared_goal_met ? "var(--good)" : "var(--ink-2)" }}
          />
        </div>
        {week.weekly?.shared_goal_met != null && (
          <p className="mt-2 text-sm font-semibold" style={{ color: week.weekly.shared_goal_met ? "var(--good)" : "var(--warn)" }}>
            {week.weekly.shared_goal_met ? "Goal met — team win 🤝" : "Missed together — regroup Monday"}
          </p>
        )}
      </section>

      <section className="card">
        <div className="mb-2 flex items-center gap-3 text-xs" style={{ color: "var(--ink-2)" }}>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--user-a)" }} /> {nameA}
          </span>
          <span className="flex items-center gap-1">
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--user-b)" }} /> {nameB}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {week.days.map((date, i) => {
            const a = week.scores[matchup.user_a][date];
            const b = week.scores[matchup.user_b][date];
            return (
              <div key={date} className="flex items-center gap-2">
                <span className="w-9 text-xs" style={{ color: "var(--ink-3)" }}>{DAY_LABELS[i]}</span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <DayBar value={a} color="var(--user-a)" />
                  <DayBar value={b} color="var(--user-b)" />
                </div>
                <span className="w-14 text-right text-xs tabular-nums" style={{ color: "var(--ink-2)" }}>
                  {a ?? "–"} · {b ?? "–"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DayBar({ value, color }: { value: number | undefined; color: string }) {
  return (
    <div className="pill-track" style={{ height: 6 }}>
      {value != null && <div className="pill-fill" style={{ width: `${value}%`, background: color }} />}
    </div>
  );
}

function sumOf(scores: Record<string, number>): number {
  return Object.values(scores).reduce((a, b) => a + b, 0);
}
