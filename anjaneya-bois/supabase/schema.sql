-- Anjaneya Bois — Supabase schema (PRD §8)
-- Two users in v1, but modeled for N users (users + matchups) so a future
-- group version is a feature flag, not a rewrite.

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  google_health_connected boolean not null default false,
  -- editable targets; sensible seeds applied in-app for the first 2 weeks
  targets_json jsonb not null default '{
    "sleep_minutes": 450,
    "steps": 8000,
    "training_minutes": 60
  }'::jsonb,
  -- rolling personal baselines (trailing 14-28 days), recomputed at the 04:00 sync
  baselines_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table matchups (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users (id),
  user_b uuid not null references users (id),
  season_start date not null,               -- resets monthly (calendar month)
  created_at timestamptz not null default now()
);

-- OAuth tokens for the Google Health API (Google OAuth 2.0).
-- The legacy Fitbit Web API is decommissioned Sept 2026; tokens do NOT
-- transfer, each user re-consents via Google OAuth.
create table google_tokens (
  user_id uuid primary key references users (id),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text not null,
  updated_at timestamptz not null default now()
);

create table daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  date date not null,
  steps int,
  sleep_minutes int,
  sleep_stages_json jsonb,                  -- null if the Fitbit Air lacks stages
  resting_hr numeric,
  hrv numeric,                              -- null if the Air lacks HRV
  active_calories int,
  source_synced_at timestamptz,
  unique (user_id, date)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  date date not null,
  type text not null check (type in ('gym', 'badminton', 'run', 'other')),
  duration_min int not null check (duration_min > 0),
  auto_detected boolean not null default false,
  logged_at timestamptz not null default now()
);

create table daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  date date not null,
  sleep_pts numeric not null,
  steps_pts numeric not null,
  exercise_pts numeric not null,
  recovery_pts numeric not null,
  calorie_bonus numeric not null default 0,
  total int not null,
  is_rest_day boolean not null default false,
  locked boolean not null default false,    -- true once the 04:00 sync settles the day
  unique (user_id, date)
);

create table duels (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references matchups (id),
  date date not null,
  type text not null check (type in ('daily', 'recovery')),
  user_a_score numeric not null,
  user_b_score numeric not null,
  winner uuid references users (id),        -- null = draw
  unique (matchup_id, date, type)
);

create table weekly (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references matchups (id),
  week_start date not null,                 -- Monday
  user_a_total int not null default 0,
  user_b_total int not null default 0,
  winner uuid references users (id),
  shared_goal_target int not null,
  shared_goal_progress int not null default 0,
  shared_goal_met boolean,
  unique (matchup_id, week_start)
);

create table reactions (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references users (id),
  to_user uuid not null references users (id),
  date date not null,
  emoji text not null,
  created_at timestamptz not null default now()
);

create table commentary (
  id uuid primary key default gen_random_uuid(),
  matchup_id uuid not null references matchups (id),
  scope text not null check (scope in ('day', 'week')),
  date date not null,
  message text not null,
  tone text not null,                       -- e.g. 'trash_talk' | 'insight' | 'hype'
  generated_at timestamptz not null default now()
);

create table nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  date date not null,
  type text not null,                       -- e.g. 'weakest_pillar' | 'behind_in_duel'
  message text not null,
  sent_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id),
  endpoint text not null unique,
  keys_json jsonb not null,
  created_at timestamptz not null default now()
);

create index daily_metrics_user_date on daily_metrics (user_id, date desc);
create index daily_scores_user_date on daily_scores (user_id, date desc);
create index sessions_user_date on sessions (user_id, date);
create index duels_matchup_date on duels (matchup_id, date desc);
create index commentary_matchup_date on commentary (matchup_id, date desc);

-- v1 access model: the app talks to the DB exclusively through server code
-- using the service-role key (the app has its own passcode gate). RLS is
-- enabled with no policies so the anon key can read nothing.
alter table users enable row level security;
alter table matchups enable row level security;
alter table google_tokens enable row level security;
alter table daily_metrics enable row level security;
alter table sessions enable row level security;
alter table daily_scores enable row level security;
alter table duels enable row level security;
alter table weekly enable row level security;
alter table reactions enable row level security;
alter table commentary enable row level security;
alter table nudges enable row level security;
alter table push_subscriptions enable row level security;

-- Seed the two users + matchup (edit names, then run once):
-- insert into users (name) values ('Player A'), ('Player B');
-- insert into matchups (user_a, user_b, season_start)
--   select a.id, b.id, date_trunc('month', now())::date
--   from users a, users b
--   where a.name = 'Player A' and b.name = 'Player B';
