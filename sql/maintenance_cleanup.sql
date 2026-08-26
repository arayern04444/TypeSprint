-- =====================================================================
-- TypeSprint — maintenance: clear out old rooms
--
-- This is NOT a one-time migration like the numbered phase*.sql files
-- — it's a snippet to paste into the Supabase SQL Editor and run
-- occasionally (e.g. monthly) once the site has public traffic. Rooms
-- currently accumulate forever (find_room_by_code only makes a room
-- unjoinable after 6 hours — it doesn't delete anything), so old rows
-- just sit there as dead weight.
--
-- Safe to re-run any time. Deleting a room automatically cascades to
-- its room_players and race_results rows (see the "on delete cascade"
-- foreign keys in sql/phase2_rooms.sql) — no separate deletes needed.
-- =====================================================================

delete from public.rooms where created_at < now() - interval '30 days';
