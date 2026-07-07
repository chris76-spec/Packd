# DuoFit

> A private, two-person fitness tracker built for Christopher and Mahak.

DuoFit is **not part of Packd** — it lives in this repo only for hosting convenience and is a
fully self-contained Next.js app in this directory. Point a separate Vercel project at
`duofit/` (Root Directory setting) or split it into its own repo as-is.

## Run it

```bash
cd duofit
npm install
npm run dev
```

Open http://localhost:3000. The app is mobile-first — use a phone-sized viewport.

## What's implemented (PRD v1.0)

| Screen | Contents |
|---|---|
| **Home** | Side-by-side couple dashboard (weight + delta, sparkline, BF%, sessions/wk, diet-week dots), 8-week weight trend, today's prompts (weigh-in, diet check, nudge), weekly shared win |
| **Log** | Quick entry for weight / workout / diet / photo / activity / measurements, recent-log feed, edit & delete with confirmation |
| **Training** | Shared 12-week block progress, progressive-overload chart per exercise, Strong-style session history with expandable sets, partner comments + comment box, per-user view toggle |
| **Body** | Weight / BF% / waist / lean-mass stat tiles, BF% trend, latest measurements with deltas vs start, US Navy BF% note, photo timeline + two-date comparison |
| **Insights** | Total sessions per person, rolling adherence %, this-week diet bars, weight trend, shared + individual program blocks, PR feed |
| **Settings** | Active-user switch, height (drives BF%), schedule-aware reminder prefs (night-shift toggle), CSV export, demo-data reset |

Workout logging is Strong-style: browsable/searchable exercise library (muscle group ×
equipment), custom exercises, per-set reps × kg with warm-up flags, the "previous
performance" column, a rest timer that starts when a set is checked off, and automatic PR
detection (heaviest set, estimated 1RM, session volume) that feeds the PR feed and the
weekly win.

BF% is auto-computed on every measurement save via the US Navy method (male/female
formulas per profile). No streaks anywhere, by design (PRD §12).

## Current data layer

This build ships **Phase 1–3 UI complete** with a local, offline-tolerant data layer:
state lives in `localStorage` (seeded with 8 weeks of demo history generated relative to
today) behind a single store (`lib/store.tsx`). Every read goes through selectors in
`lib/derive.ts`, so swapping the store for Supabase queries doesn't touch the screens.

## Path to production (Phase 4)

- **Supabase**: schema + RLS policies ready in `supabase/schema.sql` (PRD §7). Wire
  `lib/store.tsx` to Supabase Auth (two invite-only accounts) and Postgres; move photos to
  a private storage bucket with signed URLs.
- **Push reminders**: PWA web-push for the schedule-aware reminders and nudges (verify iOS
  constraints first — PRD §13).
- **Google Health sync**: server-side scheduled pull (Vercel cron), read-only, ~15-min
  latency acceptable.

## Design

Dark, warm, editorial: Fraunces display serif, DM Sans body, JetBrains Mono for data.
Chart series colors (`#d96a35` Christopher / `#63a56d` Mahak) are validated for
colorblind separation and ≥3:1 contrast on the dark card surface; every multi-series
chart carries a legend and hover tooltips.
