-- =====================================================================
-- TypeSprint — Phase 2c: enable Realtime postgres_changes on the
-- tables that need it. Row Level Security still applies on top of
-- this — being in the publication doesn't bypass RLS, it just lets
-- Realtime notify subscribers about changes to rows they're allowed
-- to see.
-- =====================================================================

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.race_results;
