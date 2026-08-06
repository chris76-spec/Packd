// Rivalry / History — season records for both duels, streaks, 14-day trend
// (PRD §7.3). One shared y-scale, two lines, per-user color, direct labels.

import { redirect } from "next/navigation";
import { getViewer, seasonStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RivalryPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { me, rival, matchup } = viewer;
  const stats = await seasonStats(matchup);

  const meIsA = matchup.user_a === me.id;
  const nameA = meIsA ? me.name : rival.name;
  const nameB = meIsA ? rival.name : me.name;

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-extrabold">Rivalry</h1>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Season since {stats.seasonStart} — resets monthly
        </p>
      </header>

      <RecordCard title="Daily duel" a={stats.daily.a} b={stats.daily.b} draws={stats.daily.draws} nameA={nameA} nameB={nameB} />
      <RecordCard title="Recovery duel" a={stats.recovery.a} b={stats.recovery.b} draws={stats.recovery.draws} nameA={nameA} nameB={nameB} />

      <section className="card flex justify-around text-center">
        <div>
          <p className="text-2xl font-extrabold tabular-nums">{stats.weeksWon.a}–{stats.weeksWon.b}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>weeks won ({nameA} first)</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold tabular-nums">{stats.goalsMetStreak}</p>
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>shared-goal streak</p>
        </div>
      </section>

      <section className="card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
          Last 14 days
        </p>
        <TrendChart trend={stats.trend} nameA={nameA} nameB={nameB} />
      </section>

      <section className="card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
          Recent daily duels
        </p>
        <div className="flex gap-1.5">
          {stats.recentDuels.map((d) => (
            <span
              key={d.date}
              title={`${d.date}: ${d.user_a_score}–${d.user_b_score}`}
              className="h-6 w-6 rounded-md text-center text-xs leading-6 font-bold"
              style={{
                background: d.winner === null ? "var(--surface-2)" : d.winner === me.id ? "var(--good)" : "var(--surface-2)",
                color: d.winner === me.id ? "#fff" : "var(--ink-2)",
              }}
            >
              {d.winner === null ? "=" : d.winner === me.id ? "W" : "L"}
            </span>
          ))}
          {stats.recentDuels.length === 0 && (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>No settled duels yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function RecordCard(props: { title: string; a: number; b: number; draws: number; nameA: string; nameB: string }) {
  return (
    <section className="card">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>{props.title}</p>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold" style={{ color: "var(--user-a)" }}>{props.nameA}</span>
        <span className="text-2xl font-extrabold tabular-nums">
          {props.a} – {props.b}
          <span className="ml-2 text-sm font-medium" style={{ color: "var(--ink-3)" }}>({props.draws}D)</span>
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--user-b)" }}>{props.nameB}</span>
      </div>
    </section>
  );
}

function TrendChart({
  trend,
  nameA,
  nameB,
}: {
  trend: { date: string; a: number | null; b: number | null }[];
  nameA: string;
  nameB: string;
}) {
  const w = 320;
  const h = 120;
  const pad = 4;
  const x = (i: number) => pad + (i / Math.max(trend.length - 1, 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const path = (pick: (t: { a: number | null; b: number | null }) => number | null) => {
    let d = "";
    trend.forEach((t, i) => {
      const v = pick(t);
      if (v == null) return;
      d += `${d === "" ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    });
    return d.trim();
  };
  const hasData = trend.some((t) => t.a != null || t.b != null);
  if (!hasData) return <p className="text-sm" style={{ color: "var(--ink-3)" }}>Scores will chart here after the first settled days.</p>;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`14-day score trend for ${nameA} and ${nameB}`}>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="var(--track)" strokeWidth="1" />
        ))}
        <path d={path((t) => t.a)} fill="none" stroke="var(--user-a)" strokeWidth="2" strokeLinecap="round" />
        <path d={path((t) => t.b)} fill="none" stroke="var(--user-b)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex gap-3 text-xs" style={{ color: "var(--ink-2)" }}>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--user-a)" }} /> {nameA}</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "var(--user-b)" }} /> {nameB}</span>
      </div>
    </div>
  );
}
