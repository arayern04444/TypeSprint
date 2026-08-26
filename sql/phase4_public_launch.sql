-- =====================================================================
-- TypeSprint — Phase 4: public-launch hardening
-- Paste this whole file into the Supabase SQL Editor and click "Run".
--
-- Three independent changes, all aimed at the same thing: this app is
-- moving from "shared with friends" to "open to the general public",
-- so anything that only worked because everyone using it was trusted
-- needs a real server-side rule instead.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Lock down `profiles` to self-only.
-- It was `using (true)` — ANY signed-in guest could read EVERY row of
-- this table (every nickname, best_wpm, and account timestamp ever
-- created), not just their own. The app itself never actually needs
-- this — the only two reads of `profiles` are always your own row.
-- ---------------------------------------------------------------------
drop policy if exists "Profiles are viewable by any signed-in user" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- 2) Nickname content filter.
-- Enforced here (not just client-side in js/wordfilter.js) because
-- anyone can call the Supabase REST API directly with the public anon
-- key and skip the app entirely — a client-side check alone is just a
-- courtesy, not a real boundary. Nicknames are stored in three places
-- (profiles, room_players, race_results), so all three get the check.
--
-- Matching is whole-word/whole-name equality against a normalized
-- form, NOT substring matching — substring matching on a word list is
-- the classic "Scunthorpe problem" (blocks innocuous names that merely
-- *contain* a bad substring, e.g. a town name). Keep this list short
-- and curated; it stops casual abuse, not a determined bad actor — if
-- you edit it, edit js/wordfilter.js's list too so both layers agree.
-- ---------------------------------------------------------------------
create or replace function public.is_nickname_blocked(p_nickname text)
returns boolean
language plpgsql
immutable
as $$
declare
  normalized text;
  glued text;
  blocklist text[] := array[
    'fuck','shit','bitch','asshole','cunt','bastard','dick','pussy','whore','slut',
    'nigger','nigga','faggot','fag','retard','tranny','chink','spic','kike','wetback',
    'rape','rapist','nazi','hitler','pedo','pedophile'
  ];
begin
  if p_nickname is null then
    return false;
  end if;
  -- lowercase, crude leetspeak substitution, then collapse everything
  -- that isn't a letter down to single spaces (this is what creates
  -- real word boundaries instead of substring hits).
  normalized := lower(p_nickname);
  normalized := translate(normalized, '01345$@!|', 'oieasaail');
  normalized := regexp_replace(normalized, '[^a-z]+', ' ', 'g');
  normalized := trim(regexp_replace(normalized, '\s+', ' ', 'g'));
  glued := replace(normalized, ' ', '');

  return glued = any(blocklist)
    or exists (
      select 1 from unnest(string_to_array(normalized, ' ')) as tok
      where tok = any(blocklist)
    );
end;
$$;

create or replace function public.enforce_nickname_filter()
returns trigger
language plpgsql
as $$
begin
  if new.nickname is null or length(trim(new.nickname)) < 2 then
    raise exception 'Nickname must be at least 2 characters.';
  end if;
  if length(new.nickname) > 20 then
    raise exception 'Nickname must be 20 characters or fewer.';
  end if;
  if public.is_nickname_blocked(new.nickname) then
    raise exception 'That nickname is not allowed.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_nickname_filter_profiles on public.profiles;
create trigger enforce_nickname_filter_profiles
  before insert or update of nickname on public.profiles
  for each row execute function public.enforce_nickname_filter();

drop trigger if exists enforce_nickname_filter_room_players on public.room_players;
create trigger enforce_nickname_filter_room_players
  before insert or update of nickname on public.room_players
  for each row execute function public.enforce_nickname_filter();

drop trigger if exists enforce_nickname_filter_race_results on public.race_results;
create trigger enforce_nickname_filter_race_results
  before insert or update of nickname on public.race_results
  for each row execute function public.enforce_nickname_filter();

-- ---------------------------------------------------------------------
-- 3) Room-creation rate limit.
-- Nothing currently stops a script from creating unlimited rooms in a
-- loop. Cap it at 5 per host per rolling 10 minutes — generous for any
-- real player, cheap to raise later if it turns out too strict.
-- ---------------------------------------------------------------------
create or replace function public.enforce_room_creation_rate_limit()
returns trigger
language plpgsql
as $$
declare
  recent_count integer;
begin
  select count(*) into recent_count
  from public.rooms
  where host_id = new.host_id
    and created_at > now() - interval '10 minutes';
  if recent_count >= 5 then
    raise exception 'You are creating rooms too quickly — wait a few minutes and try again.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_room_creation_rate_limit_trigger on public.rooms;
create trigger enforce_room_creation_rate_limit_trigger
  before insert on public.rooms
  for each row execute function public.enforce_room_creation_rate_limit();
