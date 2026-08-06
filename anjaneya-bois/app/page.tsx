// Today — big daily score + pillar breakdown, yesterday's duel verdict,
// reactions, and live progress from the daytime pulls (PRD §7.1).

import { redirect } from "next/navigation";
import PillarBars from "@/components/pillar-bars";
import ScoreRing from "@/components/score-ring";
import TodayActions from "@/components/today-actions";
import { localToday } from "@/lib/dates";
import {
  emptyScore,
  getViewer,
  latestCommentary,
  latestReactions,
  scoresFor,
  yesterdayDuel,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { me, rival, matchup } = viewer;

  const today = localToday();
  const todayScores = await scoresFor([me.id, rival.id], today);
  const mine = todayScores.get(me.id) ?? emptyScore(me.id, today);
  const theirs = todayScores.get(rival.id) ?? emptyScore(rival.id, today);

  const duels = await yesterdayDuel(matchup.id);
  const commentary = await latestCommentary(matchup.id, "day");
  const myReactions = await latestReactions(matchup.id, me.id, duels.date);

  const meIsA = matchup.user_a === me.id;
  const myColor = meIsA ? "var(--user-a)" : "var(--user-b)";
  const rivalColor = meIsA ? "var(--user-b)" : "var(--user-a)";

  const verdict = duels.daily
    ? duels.daily.winner === null
      ? `Yesterday: draw ${duels.daily.user_a_score}–${duels.daily.user_b_score}`
      : duels.daily.winner === me.id
        ? `Yesterday: you took it ${fmtDuel(duels.daily, meIsA)}`
        : `Yesterday: ${rival.name} took it ${fmtDuel(duels.daily, !meIsA)}`
    : "Yesterday: not settled yet";

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-extrabold">Today</h1>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>{today}</span>
      </header>

      <section className="card flex items-center gap-4">
        <ScoreRing score={mine.total} color={myColor} label={mine.is_rest_day ? "rest day" : "so far"} />
        <div className="flex-1">
          <PillarBars points={mine} color={myColor} />
        </div>
      </section>

      <section className="card flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{rival.name}</p>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            {theirs.is_rest_day ? "rest day" : "today so far"}
          </p>
        </div>
        <span className="text-3xl font-extrabold tabular-nums" style={{ color: rivalColor }}>
          {theirs.total}
        </span>
      </section>

      <section className="card">
        <p className="text-sm font-semibold">{verdict}</p>
        {duels.recovery && (
          <p className="mt-1 text-xs" style={{ color: "var(--ink-2)" }}>
            Recovery duel:{" "}
            {duels.recovery.winner === null
              ? "draw"
              : duels.recovery.winner === me.id
                ? "yours"
                : `${rival.name}'s`}{" "}
            ({duels.recovery.user_a_score} – {duels.recovery.user_b_score})
          </p>
        )}
        {myReactions.length > 0 && (
          <p className="mt-1 text-sm">{rival.name} reacted: {myReactions.join(" ")}</p>
        )}
      </section>

      {commentary.length > 0 && (
        <section className="card flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-3)" }}>
            The Commentator
          </p>
          {commentary.map((c) => (
            <p key={c.id} className="text-sm" style={{ color: "var(--ink-2)" }}>
              {c.tone === "trash_talk" ? "🗑️ " : c.tone === "hype" ? "📣 " : "💡 "}
              {c.message}
            </p>
          ))}
        </section>
      )}

      <TodayActions isRestDay={mine.is_rest_day} />
    </div>
  );
}

function fmtDuel(duel: { user_a_score: number; user_b_score: number }, winnerIsA: boolean): string {
  const [w, l] = winnerIsA
    ? [duel.user_a_score, duel.user_b_score]
    : [duel.user_b_score, duel.user_a_score];
  return `${w}–${l}`;
}
