-- =====================================================================
-- TypeSprint — Phase 5: opt-in global leaderboard
-- Paste this whole file into the Supabase SQL Editor and click "Run".
--
-- Deliberately NOT a real-accounts system — this reuses the exact same
-- guest identity multiplayer already has (Auth.playAsGuest). Anyone
-- can browse the leaderboard just by having a session (even a silent,
-- nickname-less anonymous one — see js/leaderboard.js); only actually
-- submitting a score requires a nickname, same as joining a room does.
-- Solo progress itself stays 100% local — this table only ever gets a
-- row when a player explicitly hits "Submit to Leaderboard".
-- =====================================================================

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  nickname text not null,
  wpm numeric not null check (wpm >= 0 and wpm <= 300),
  accuracy numeric not null check (accuracy >= 0 and accuracy <= 100),
  best_combo integer not null default 0,
  chars integer not null,
  duration_sec numeric not null,
  difficulty text not null,
  race_mode text not null default 'passage' check (race_mode in ('passage', 'timed')),
  timed_duration_sec integer,
  created_at timestamptz not null default now()
);

alter table public.leaderboard_entries enable row level security;

drop policy if exists "Anyone with a session can view the leaderboard" on public.leaderboard_entries;
create policy "Anyone with a session can view the leaderboard"
  on public.leaderboard_entries for select
  to authenticated
  using (true);

drop policy if exists "You can submit your own leaderboard entry" on public.leaderboard_entries;
create policy "You can submit your own leaderboard entry"
  on public.leaderboard_entries for insert
  to authenticated
  with check (auth.uid() = user_id);
-- No update/delete policy at all — append-only, same as race_results.

grant select, insert on public.leaderboard_entries to authenticated;

-- Reuse the exact trigger functions already protecting race_results
-- (sql/phase2_rooms.sql, sql/phase4_public_launch.sql) rather than
-- inventing parallel ones — column names (wpm, chars, duration_sec,
-- nickname) match on purpose.
drop trigger if exists enforce_nickname_filter_leaderboard on public.leaderboard_entries;
create trigger enforce_nickname_filter_leaderboard
  before insert or update of nickname on public.leaderboard_entries
  for each row execute function public.enforce_nickname_filter();

drop trigger if exists validate_leaderboard_entry_trigger on public.leaderboard_entries;
create trigger validate_leaderboard_entry_trigger
  before insert on public.leaderboard_entries
  for each row execute function public.validate_race_result();

-- Submission rate limit — same idea as enforce_room_creation_rate_limit
-- in sql/phase4_public_launch.sql, so a script can't flood the board.
create or replace function public.enforce_leaderboard_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.leaderboard_entries
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';
  if recent_count >= 20 then
    raise exception 'Too many leaderboard submissions — try again later.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_leaderboard_rate_limit_trigger on public.leaderboard_entries;
create trigger enforce_leaderboard_rate_limit_trigger
  before insert on public.leaderboard_entries
  for each row execute function public.enforce_leaderboard_rate_limit();

-- Best single entry per player per (difficulty, mode, duration) bucket,
-- ranked by wpm — without this, one active player's many attempts
-- could fill the entire top of the board. security definer (like
-- find_room_by_code in sql/phase2_rooms.sql) since the dedup needs to
-- scan across every player's rows, not just the caller's own.
create or replace function public.get_leaderboard(
  p_race_mode text, p_difficulty text, p_timed_duration_sec int, p_limit int default 50
)
returns table (nickname text, wpm numeric, accuracy numeric, created_at timestamptz)
language sql
security definer set search_path = public
stable
as $$
  select nickname, wpm, accuracy, created_at
  from (
    select distinct on (user_id) nickname, wpm, accuracy, created_at
    from public.leaderboard_entries
    where race_mode = p_race_mode
      and difficulty = p_difficulty
      and (p_timed_duration_sec is null or timed_duration_sec = p_timed_duration_sec)
    order by user_id, wpm desc
  ) best_per_player
  order by wpm desc
  limit p_limit;
$$;

grant execute on function public.get_leaderboard(text, text, int, int) to authenticated;
