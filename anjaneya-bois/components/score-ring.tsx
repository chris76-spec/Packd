// Hero score ring: the single 0–100 number is the headline; the ring is the
// supporting mark (thin stroke, rounded cap, recessive track).

export default function ScoreRing({
  score,
  color,
  size = 160,
  label,
}: {
  score: number;
  color: string;
  size?: number;
  label?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score, 0), 100);
  const dash = (clamped / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Score ${score} of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold tabular-nums" style={{ color: "var(--ink)" }}>
          {Math.round(score)}
        </span>
        {label && (
          <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
