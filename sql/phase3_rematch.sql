-- =====================================================================
-- TypeSprint — Phase 3: "Play Again" (rematch) support
-- Paste this whole file into the Supabase SQL Editor and click "Run".
--
-- Why this is needed: race_results currently has a unique constraint
-- of (room_id, user_id) — one result per player per room, ever. That's
-- fine for a single race, but it means a second race in the same room
-- would fail to save anyone's result. This adds a `round` counter to
-- rooms and race_results, and widens the uniqueness to
-- (room_id, user_id, round), so the same room + same players can race
-- again as many times as they like.
-- =====================================================================

alter table public.rooms add column if not exists round integer not null default 0;

alter table public.race_results add column if not exists round integer not null default 1;

alter table public.race_results drop constraint if exists race_results_room_id_user_id_key;
alter table public.race_results
  add constraint race_results_room_id_user_id_round_key unique (room_id, user_id, round);
