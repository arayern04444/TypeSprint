-- =====================================================================
-- TypeSprint — Phase 1b: table grants
-- Needed because "Automatically expose new tables" was turned off at
-- project creation (the more secure default) — RLS policies alone
-- aren't enough; Postgres also needs an explicit table-level GRANT to
-- the `authenticated` role (which anonymous/guest sessions use too).
-- =====================================================================

grant select, update on public.profiles to authenticated;
