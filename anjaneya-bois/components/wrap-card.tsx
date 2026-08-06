"use client";

// The shareable recap card. Drawn as SVG so "Save image" can serialize it to a
// PNG entirely client-side (no server rendering dependency).

import { useRef } from "react";
import type { WeeklyRow } from "@/lib/types";

const W = 360;
const H = 480;

export default function WrapCard({
  week,
  nameA,
  nameB,
  winnerName,
  lines,
}: {
  week: WeeklyRow;
  nameA: string;
  nameB: string;
  winnerName: string | null;
  lines: string[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  async function saveImage() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.download = `anjaneya-bois-week-${week.week_start}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  const goalPct = Math.min(week.shared_goal_progress / week.shared_goal_target, 1);
  const maxTotal = Math.max(week.user_a_total, week.user_b_total, 1);

  return (
    <div className="flex flex-col gap-3">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-2xl"
        xmlns="http://www.w3.org/2000/svg"
        style={{ background: "#131312" }}
      >
        <rect width={W} height={H} rx="24" fill="#131312" />
        <text x={24} y={44} fill="#86857c" fontSize="12" fontWeight="600" letterSpacing="2" fontFamily="system-ui">
          ANJANEYA BOIS · WEEK OF {week.week_start}
        </text>

        <text x={24} y={92} fill="#ffffff" fontSize="28" fontWeight="800" fontFamily="system-ui">
          {winnerName ? `${winnerName} takes the week` : "Dead-heat week"}
        </text>

        {/* head-to-head bars */}
        <Bar y={130} name={nameA} total={week.user_a_total} max={maxTotal} color="#3987e5" />
        <Bar y={186} name={nameB} total={week.user_b_total} max={maxTotal} color="#d95926" />

        {/* shared goal */}
        <text x={24} y={266} fill="#c3c2b7" fontSize="12" fontFamily="system-ui">
          Shared goal · {week.shared_goal_progress} / {week.shared_goal_target}
        </text>
        <rect x={24} y={276} width={W - 48} height={8} rx="4" fill="#2e2e2b" />
        <rect x={24} y={276} width={(W - 48) * goalPct} height={8} rx="4" fill={week.shared_goal_met ? "#35a835" : "#c3c2b7"} />
        <text x={24} y={304} fill={week.shared_goal_met ? "#35a835" : "#c98500"} fontSize="13" fontWeight="700" fontFamily="system-ui">
          {week.shared_goal_met ? "Both win — goal met 🤝" : "Missed together — next week"}
        </text>

        {/* commentator lines */}
        {lines.slice(0, 3).map((line, i) => (
          <foreignObject key={i} x={24} y={330 + i * 44} width={W - 48} height={42}>
            <p
              style={{
                color: "#c3c2b7",
                fontSize: 12,
                lineHeight: 1.3,
                fontFamily: "system-ui",
                margin: 0,
              }}
            >
              “{line}”
            </p>
          </foreignObject>
        ))}
      </svg>

      <button
        onClick={saveImage}
        className="rounded-xl py-3 text-sm font-semibold"
        style={{ background: "var(--user-a)", color: "#fff" }}
      >
        Save as image
      </button>
    </div>
  );
}

function Bar({ y, name, total, max, color }: { y: number; name: string; total: number; max: number; color: string }) {
  const width = (W - 48 - 60) * (total / max);
  return (
    <g fontFamily="system-ui">
      <text x={24} y={y + 6} fill="#ffffff" fontSize="13" fontWeight="600">
        {name}
      </text>
      <rect x={24} y={y + 14} width={W - 48 - 60} height={12} rx="4" fill="#2e2e2b" />
      <rect x={24} y={y + 14} width={Math.max(width, 4)} height={12} rx="4" fill={color} />
      <text x={W - 24} y={y + 25} fill="#ffffff" fontSize="14" fontWeight="800" textAnchor="end">
        {total}
      </text>
    </g>
  );
}
