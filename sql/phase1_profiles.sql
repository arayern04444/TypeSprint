-- =====================================================================
-- TypeSprint — Phase 1: profiles table
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- =====================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  is_guest boolean not null default true,
  best_wpm integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in user can see other players' nicknames (needed later so
-- room members can see each other) — nothing sensitive is exposed here.
drop policy if exists "Profiles are viewable by any signed-in user" on public.profiles;
create policy "Profiles are viewable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

-- You can only edit your own profile.
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profile row the moment a new auth user is created —
-- covers guest (anonymous) sign-in and email sign-up the same way, so
-- there's never a race between "signed in" and "has a profile".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, is_guest)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nickname', 'Guest-' || substr(new.id::text, 1, 6)),
    coalesce(new.is_anonymous, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
