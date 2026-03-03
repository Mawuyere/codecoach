-- ============================================================
-- CodeCoach Academy — Supabase Schema
-- Run this ONCE in: app.supabase.com → SQL Editor → New Query
-- ============================================================

-- ── USER PROGRESS ──────────────────────────────────────────
-- Stores per-user, per-course XP / completion data as JSON.
-- One row per (user, course). Upserted on every save.

create table if not exists user_progress (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  course_id   text not null,                    -- e.g. 'python', 'linux'
  progress_data jsonb not null default '{}',    -- { xp, streak, completed: {0:true,...} }
  updated_at  timestamptz default now(),

  unique (user_id, course_id)
);

-- Index for fast lookups by user
create index if not exists idx_progress_user on user_progress(user_id);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────
-- Users can ONLY read and write their own progress rows.

alter table user_progress enable row level security;

create policy "Users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id);

-- ── USER PROFILES (optional) ───────────────────────────────
-- Extended profile data beyond what auth.users stores.
-- Auto-created when a user signs up via the trigger below.

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
