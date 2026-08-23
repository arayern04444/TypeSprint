-- =====================================================================
-- TypeSprint — Phase 2b: fix "view room" policy for room creation
-- The host needs to see their own new room immediately on creation,
-- before they've been added to room_players (that happens right
-- after). Widen the SELECT policy to also allow the host directly.
-- =====================================================================

drop policy if exists "Members can view their room" on public.rooms;
create policy "Members can view their room"
  on public.rooms for select
  to authenticated
  using (auth.uid() = host_id or public.is_room_member(id));
