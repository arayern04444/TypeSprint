-- =====================================================================
-- TypeSprint — Phase 2: rooms, room_players, race_results
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- =====================================================================

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles(id),
  status text not null default 'lobby' check (status in ('lobby','countdown','racing','finished')),
  passage_text text not null,
  passage_difficulty text not null,
  race_start_at timestamptz,
  max_players integer not null default 8,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  nickname text not null,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id)
);

create table if not exists public.race_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  nickname text not null,
  wpm numeric not null check (wpm >= 0 and wpm <= 300),
  accuracy numeric not null check (accuracy >= 0 and accuracy <= 100),
  best_combo integer not null default 0,
  duration_sec numeric not null,
  chars integer not null,
  finished_at timestamptz not null default now(),
  unique (room_id, user_id)
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.race_results enable row level security;

-- security definer helper: lets policies check "am I in this room?"
-- without a self-referential RLS query on room_players (a known
-- Postgres RLS footgun).
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.room_players
    where room_id = p_room_id and user_id = auth.uid()
  );
$$;

-- Look up a room by its short code without exposing a public listing
-- of every room. Ignores rooms older than 6 hours (abandoned rooms
-- just quietly stop being joinable, no cleanup job needed) and rooms
-- that are already racing/finished.
create or replace function public.find_room_by_code(p_code text)
returns table (
  id uuid,
  status text,
  passage_difficulty text,
  host_nickname text,
  player_count bigint
)
language sql
security definer set search_path = public
stable
as $$
  select r.id, r.status, r.passage_difficulty, p.nickname,
         (select count(*) from public.room_players rp where rp.room_id = r.id)
  from public.rooms r
  join public.profiles p on p.id = r.host_id
  where r.code = upper(p_code)
    and r.status = 'lobby'
    and r.created_at > now() - interval '6 hours';
$$;

drop policy if exists "Members can view their room" on public.rooms;
create policy "Members can view their room"
  on public.rooms for select
  to authenticated
  using (public.is_room_member(id));

drop policy if exists "Any signed-in user can create a room" on public.rooms;
create policy "Any signed-in user can create a room"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = host_id);

drop policy if exists "Only the host can update the room" on public.rooms;
create policy "Only the host can update the room"
  on public.rooms for update
  to authenticated
  using (auth.uid() = host_id);

drop policy if exists "Members can view room_players in their room" on public.room_players;
create policy "Members can view room_players in their room"
  on public.room_players for select
  to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "You can join a room as yourself" on public.room_players;
create policy "You can join a room as yourself"
  on public.room_players for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "You can update your own room_players row" on public.room_players;
create policy "You can update your own room_players row"
  on public.room_players for update
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "You can leave a room" on public.room_players;
create policy "You can leave a room"
  on public.room_players for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Members can view race_results in their room" on public.race_results;
create policy "Members can view race_results in their room"
  on public.race_results for select
  to authenticated
  using (public.is_room_member(room_id));

drop policy if exists "You can submit your own race result" on public.race_results;
create policy "You can submit your own race result"
  on public.race_results for insert
  to authenticated
  with check (auth.uid() = user_id);
-- No update policy at all on race_results: results are append-only.

-- Table-level grants (needed since "Automatically expose new tables"
-- was turned off at project creation — see sql/phase1b_grants.sql).
grant select, insert, update, delete on public.room_players to authenticated;
grant select, insert, update on public.rooms to authenticated;
grant select, insert on public.race_results to authenticated;
grant execute on function public.find_room_by_code(text) to authenticated;

-- Lightweight anti-cheat: reject a submitted WPM that's wildly
-- inconsistent with chars/duration_sec (not bulletproof, just stops
-- naive tampering).
create or replace function public.validate_race_result()
returns trigger
language plpgsql
as $$
declare
  expected_wpm numeric;
begin
  if new.duration_sec <= 0 then
    raise exception 'duration_sec must be positive';
  end if;
  expected_wpm := (new.chars / 5.0) / (new.duration_sec / 60.0);
  if new.wpm > expected_wpm * 1.15 + 5 then
    raise exception 'submitted wpm inconsistent with chars/duration';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_race_result_trigger on public.race_results;
create trigger validate_race_result_trigger
  before insert on public.race_results
  for each row execute function public.validate_race_result();

-- Enforce max_players on join (client-side counting isn't race-safe).
create or replace function public.enforce_max_players()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
  cap integer;
begin
  select max_players into cap from public.rooms where id = new.room_id;
  select count(*) into current_count from public.room_players where room_id = new.room_id;
  if current_count >= cap then
    raise exception 'room is full';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_max_players_trigger on public.room_players;
create trigger enforce_max_players_trigger
  before insert on public.room_players
  for each row execute function public.enforce_max_players();
