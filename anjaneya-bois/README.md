# Anjaneya Bois

Private two-person total-fitness rivalry. Auto-imports **Fitbit Air** data via the
**Google Health API**, scores each day **0–100** across four pillars (sleep 25,
steps 20, structured exercise 35, recovery 20), and runs a daily duel, a recovery
duel, a weekly league, a shared cooperative goal, AI trash talk, behavioral
nudges, and a Sunday recap card.

> ⚠️ Built on the **Google Health API** (`health.googleapis.com`, Google OAuth 2.0),
> not the legacy Fitbit Web API — legacy endpoints are decommissioned September 2026.

## Stack

- **Next.js 16** (App Router, PWA + web push) on **Vercel** (Cron for the syncs)
- **Supabase** Postgres (schema in `supabase/schema.sql`, N-user-ready data model)
- **Claude API** (`claude-opus-5`) for the AI Commentator + nudge phrasing, with
  structured-JSON output
- **Google Health API** for steps / sleep (+stages if the Air exposes them) /
  resting HR / HRV (fallback to RHR) / active calories

## How scoring works

Every pillar is `min(actual / personal_target, 1) × cap` — scored against *your own*
rolling 21-day baseline (seeded with steps 8,000 / sleep 450 min for the first
2 weeks), so the contest stays fair at different fitness levels. Active calories are
**not** a pillar (max +3 flex bonus). Rest days drop the exercise pillar and
renormalize over 65, so a well-slept rest day still scores ~90–100. The scoring
engine is pure (`lib/score.ts`) and tested (`npm test`).

## Sync schedule (Vercel Cron, UTC for Asia/Kolkata)

| Local | UTC cron | Route | Job |
|---|---|---|---|
| 04:00 | `30 22 * * *` | `/api/cron/settle` | Final pull, lock scores, decide both duels, weekly league + shared goal, AI commentary, Sunday wrap, morning push |
| 13:00 | `30 7 * * *` | `/api/cron/pulse` | Partial pull → mid-day nudges |
| 19:00 | `30 13 * * *` | `/api/cron/pulse` | Partial pull → evening "catch up now" nudges |

Different timezone? Adjust the crons in `vercel.json` and `APP_TIMEZONE`.

## Setup

1. **Supabase**: create a project, run `supabase/schema.sql` in the SQL editor,
   then run the seed insert at the bottom of the file with your two names.
2. **Google Cloud**: create a project, enable the **Google Health API**, create an
   OAuth 2.0 Web client, add the redirect URI
   `https://YOUR_DOMAIN/api/auth/google/callback`.
3. **Env vars**: copy `.env.example` → `.env.local` (locally) / Vercel project
   settings (prod) and fill everything in. Generate VAPID keys with
   `npx web-push generate-vapid-keys`.
4. **Deploy to Vercel** (`vercel.json` carries the cron schedule). Set the
   project root to `anjaneya-bois/`.
5. On the deployed app: log in with the passcode, then in **Settings** each of you
   taps **Connect Google Health** (fresh consent — old Fitbit tokens don't
   transfer) and **Enable nudge notifications** (install the PWA to the home
   screen first on iOS).

## Dev

```sh
npm install
npm test        # scoring engine tests
npm run dev
```

Trigger syncs manually while testing:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/pulse
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/settle
```

## Open items resolved during build (PRD §11)

1. **Sleep stages** — parsed when present; automatic duration-only fallback.
2. **HRV** — used when present; automatic resting-HR-trend fallback.
3. **Notifications** — PWA Web Push for v1 (native later if wanted).
4. **Season length** — monthly (calendar month).

One thing to verify on first connect: the Google Health API scope strings and
data-type names in `lib/health/google-health.ts` (`HEALTH_SCOPES`, `DATA_TYPES`)
against your Google Cloud Console — the API is new and names are centralized
there so a rename is a one-line fix.
