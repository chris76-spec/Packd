-- DuoFit — Supabase schema (PRD §7)
-- Two fixed users; RLS gives each user ownership of their rows and the
-- partner read access (plus comment/nudge write) for the couple layer.

create table profiles (
  id uuid primary key references auth.users (id),
  name text not null,
  sex text not null check (sex in ('male', 'female')),
  height_cm numeric not null,
  birth_date date,
  shift_prefs jsonb default '{}'::jsonb
);

create table weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  weight_kg numeric not null,
  time_of_day text check (time_of_day in ('morning', 'afternoon', 'evening'))
);

create table measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  neck numeric not null,
  chest numeric not null,
  waist numeric not null,
  hips numeric not null,
  arm_l numeric not null,
  arm_r numeric not null,
  thighs numeric not null,
  bf_percent numeric not null -- US Navy method, computed in-app on write
);

create table exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null check (muscle_group in ('chest','back','legs','shoulders','arms','core')),
  equipment text not null check (equipment in ('barbell','dumbbell','machine','cable','bodyweight')),
  is_custom boolean not null default false,
  owner_id uuid references profiles (id) -- null for built-ins
);

create table workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  time time,
  name text not null,
  notes text
);

create table workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts (id) on delete cascade,
  exercise_id uuid not null references exercises (id),
  set_no int not null,
  reps int not null,
  weight numeric not null,
  is_warmup boolean not null default false,
  is_failure boolean not null default false
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  type text not null check (type in ('badminton','walk','run','cardio','other')),
  duration_min int not null,
  distance_km numeric,
  note text
);

create table personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  exercise_id uuid not null references exercises (id),
  record_type text not null check (record_type in ('max_weight','est_1rm','max_volume','max_reps')),
  value numeric not null,
  achieved_date date not null,
  workout_id uuid references workouts (id) on delete cascade
);

create table adherence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  status text not null check (status in ('yes','partial','no')),
  note text,
  unique (user_id, date)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  angle text not null check (angle in ('front','side','back')),
  storage_path text not null,
  is_private boolean not null default false
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles (id),
  target_type text not null check (target_type in ('workout','weight','measurement','photo','activity')),
  target_id uuid not null,
  body text not null,
  reaction text,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

create table nudges (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles (id),
  to_user uuid not null references profiles (id),
  type text not null default 'log-reminder',
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

create table programs (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('shared','individual')),
  user_id uuid references profiles (id), -- null when shared
  name text not null,
  start_date date not null,
  weeks int not null default 12,
  goal jsonb default '{}'::jsonb
);

create table health_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id),
  date date not null,
  steps int,
  sleep_min int,
  avg_hr numeric,
  unique (user_id, date)
);

-- RLS: owner full access; the (single) partner gets read access, and
-- write access on comments/nudges targeting the owner's records.
alter table profiles enable row level security;
alter table weights enable row level security;
alter table measurements enable row level security;
alter table exercises enable row level security;
alter table workouts enable row level security;
alter table workout_sets enable row level security;
alter table activities enable row level security;
alter table personal_records enable row level security;
alter table adherence_logs enable row level security;
alter table photos enable row level security;
alter table comments enable row level security;
alter table nudges enable row level security;
alter table programs enable row level security;
alter table health_metrics enable row level security;

-- Both accounts may read everything (two known users, photos honor is_private):
create policy "couple read" on weights for select using (auth.uid() is not null);
create policy "owner write" on weights for all using (auth.uid() = user_id);
create policy "couple read" on measurements for select using (auth.uid() is not null);
create policy "owner write" on measurements for all using (auth.uid() = user_id);
create policy "couple read" on workouts for select using (auth.uid() is not null);
create policy "owner write" on workouts for all using (auth.uid() = user_id);
create policy "couple read" on activities for select using (auth.uid() is not null);
create policy "owner write" on activities for all using (auth.uid() = user_id);
create policy "couple read" on adherence_logs for select using (auth.uid() is not null);
create policy "owner write" on adherence_logs for all using (auth.uid() = user_id);
create policy "photos read" on photos for select using (auth.uid() = user_id or not is_private);
create policy "owner write" on photos for all using (auth.uid() = user_id);
create policy "couple read" on comments for select using (auth.uid() is not null);
create policy "author write" on comments for all using (auth.uid() = author_id);
create policy "couple read" on nudges for select using (auth.uid() is not null);
create policy "sender write" on nudges for all using (auth.uid() = from_user);
