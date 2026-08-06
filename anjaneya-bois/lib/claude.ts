// AI Commentator + nudge phrasing (PRD §6.3, §6.4).
// Runs server-side at the 04:00 settle and the daytime pulses. Returns
// structured JSON (guaranteed by output_config.format), playful never mean.

import Anthropic from "@anthropic-ai/sdk";
import type { CommentaryLine, DailyScore, User } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

const COMMENTARY_SCHEMA = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          message: { type: "string" },
          tone: { type: "string", enum: ["trash_talk", "insight", "hype"] },
        },
        required: ["message", "tone"],
        additionalProperties: false,
      },
    },
  },
  required: ["lines"],
  additionalProperties: false,
} as const;

const SYSTEM = `You are the resident commentator for "Anjaneya Bois", a private two-person total-fitness rivalry between two friends who live together. You see their real daily scores (0-100, built from sleep, steps, structured exercise, and recovery pillars) and you narrate the rivalry.

Voice: playful roast-battle energy between close friends. Needle them about real patterns in the data — a cratered sleep pillar, a losing streak, one of them owning the gym pillar while the other owns steps. Never mean, never about bodies or health conditions, never discouraging. Rest days are respected, not mocked. Keep each line under 140 characters. Write 2-4 lines.`;

interface DayContext {
  date: string;
  users: [User, User];
  scores: [DailyScore, DailyScore];
  dailyWinner: string | null;
  recoveryWinner: string | null;
  seasonRecord: string;
  streak?: string;
}

export async function generateDailyCommentary(ctx: DayContext): Promise<CommentaryLine[]> {
  const [a, b] = ctx.users;
  const [sa, sb] = ctx.scores;
  const prompt = {
    date: ctx.date,
    players: [
      { name: a.name, ...pillarSummary(sa) },
      { name: b.name, ...pillarSummary(sb) },
    ],
    daily_duel_winner: nameOf(ctx.dailyWinner, ctx.users) ?? "draw",
    recovery_duel_winner: nameOf(ctx.recoveryWinner, ctx.users) ?? "draw",
    season_record: ctx.seasonRecord,
    streak: ctx.streak ?? null,
  };

  return callForLines(
    `Yesterday's finalized data:\n${JSON.stringify(prompt, null, 2)}\n\nWrite the morning commentary lines.`,
  );
}

export async function generateWeeklyCommentary(summary: object): Promise<CommentaryLine[]> {
  return callForLines(
    `The week just ended. Weekly summary:\n${JSON.stringify(summary, null, 2)}\n\nWrite the Sunday-wrap commentary lines (who won the week, pillar ownership, biggest swing, shared goal result).`,
  );
}

/**
 * Phrase a rule-triggered nudge (weakest pillar / behind in the duel).
 * Falls back to the plain rule-based message if the API call fails —
 * nudges must never be lost to an LLM hiccup.
 */
export async function phraseNudge(fallback: string, context: object): Promise<string> {
  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 300,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: { message: { type: "string" } },
            required: ["message"],
            additionalProperties: false,
          },
        },
      },
      system:
        "You phrase short motivational push notifications for a playful two-person fitness rivalry. One sentence, under 120 characters, concrete and actionable, friendly-competitive. Never mean.",
      messages: [
        {
          role: "user",
          content: `Context: ${JSON.stringify(context)}\nBase message to rephrase: "${fallback}"`,
        },
      ],
    });
    if (response.stop_reason === "refusal") return fallback;
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return fallback;
    return (JSON.parse(text.text).message as string) || fallback;
  } catch {
    return fallback;
  }
}

async function callForLines(userPrompt: string): Promise<CommentaryLine[]> {
  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 1000,
      output_config: { effort: "low", format: { type: "json_schema", schema: COMMENTARY_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });
    if (response.stop_reason === "refusal") return [];
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return [];
    const parsed = JSON.parse(text.text) as { lines: CommentaryLine[] };
    return parsed.lines ?? [];
  } catch (err) {
    console.error("commentary generation failed", err);
    return [];
  }
}

function pillarSummary(s: DailyScore) {
  return {
    total: s.total,
    rest_day: s.is_rest_day,
    pillars: {
      sleep: s.sleep_pts,
      steps: s.steps_pts,
      exercise: s.exercise_pts,
      recovery: s.recovery_pts,
    },
  };
}

function nameOf(userId: string | null, users: [User, User]): string | null {
  if (!userId) return null;
  return users.find((u) => u.id === userId)?.name ?? null;
}
