// Sunday Wrap — the shareable recap card (PRD §6.5, §7.4). Rendered as a
// self-contained card; "Save as image" uses SVG serialization client-side.

import { redirect } from "next/navigation";
import WrapCard from "@/components/wrap-card";
import { getViewer, latestCommentary } from "@/lib/queries";
import { db } from "@/lib/supabase";
import type { WeeklyRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WrapPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { me, rival, matchup } = viewer;

  const { data } = await db()
    .from("weekly")
    .select("*")
    .eq("matchup_id", matchup.id)
    .not("winner", "is", null)
    .order("week_start", { ascending: false })
    .limit(1);
  const week = (data?.[0] as WeeklyRow) ?? null;
  const commentary = await latestCommentary(matchup.id, "week");

  const meIsA = matchup.user_a === me.id;
  const nameA = meIsA ? me.name : rival.name;
  const nameB = meIsA ? rival.name : me.name;

  if (!week) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-extrabold">Sunday Wrap</h1>
        <p className="card text-sm" style={{ color: "var(--ink-2)" }}>
          The first wrap card lands after your first full week — built at the Sunday 4am settle.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-extrabold">Sunday Wrap</h1>
      <WrapCard
        week={week}
        nameA={nameA}
        nameB={nameB}
        winnerName={week.winner === matchup.user_a ? nameA : week.winner === matchup.user_b ? nameB : null}
        lines={commentary.map((c) => c.message)}
      />
    </div>
  );
}
