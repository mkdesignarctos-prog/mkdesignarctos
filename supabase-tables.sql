-- Execute this SQL in your Supabase SQL Editor to create the required tables

-- Table for login credentials
create table if not exists public.app_credentials (
  user_id text primary key,
  username text unique,
  password_hash text
);

-- Table for saving user alarms
create table if not exists public.app_users (
  user_id text primary key,
  alarms_data jsonb,
  preferences jsonb default '{}'::jsonb
);

-- Table for saving user custom uploaded music/ringtones
create table if not exists public.app_music (
  music_id text,
  user_id text,
  base64_data text,
  primary key (music_id, user_id)
);

-- Table for saving user stopwatch laps/state
create table if not exists public.app_stopwatch (
  user_id text primary key,
  stopwatch_data jsonb
);

-- Table for saving user timer state/presets
create table if not exists public.app_timers (
  user_id text primary key,
  timer_data jsonb
);

-- Table for saving odometer and activity data
create table if not exists public.app_activity (
  user_id text primary key,
  activity_data jsonb
);

-- Table for global application statistics (like visitor counter)
create table if not exists public.app_stats (
  id text primary key,
  value bigint default 0
);
insert into public.app_stats (id, value) values ('visitor_count', 0) on conflict do nothing;
