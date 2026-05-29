-- Execute this SQL in your Supabase SQL Editor to create the required tables

-- Table for saving user alarms
create table if not exists public.app_users (
  user_id text primary key,
  alarms_data jsonb
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
