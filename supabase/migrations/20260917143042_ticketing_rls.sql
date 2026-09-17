-- Row-Level Security: the primary authorization boundary. Design D8.
--
-- Model:
--   * events / ticket_types  -> hosts manage their own; the public reads published ones.
--   * orders / attendees      -> hosts READ their own events' rows (for the directory);
--                                nobody gets direct anon/authenticated write access.
--   * reservations / processed_webhook_events -> no policies at all: RLS on with zero
--                                policies denies every non-superuser role. Only server
--                                routes reach them, via service_role (which bypasses RLS)
--                                and the SECURITY DEFINER functions.
--
-- auth.uid() is wrapped in (select ...) so it is evaluated once per query, not per row.

alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.reservations enable row level security;
alter table public.orders enable row level security;
alter table public.attendees enable row level security;
alter table public.processed_webhook_events enable row level security;

-- Force RLS so even the table owner is subject to policies. service_role has BYPASSRLS,
-- so server routes are unaffected; this closes the owner-bypass hole.
alter table public.events force row level security;
alter table public.ticket_types force row level security;
alter table public.reservations force row level security;
alter table public.orders force row level security;
alter table public.attendees force row level security;
alter table public.processed_webhook_events force row level security;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
-- Public (and hosts) may read published events.
create policy events_select_published on public.events
  for select
  to anon, authenticated
  using (status = 'published');

-- A host may read every event they own, regardless of status.
create policy events_select_own on public.events
  for select
  to authenticated
  using ((select auth.uid()) = host_id);

create policy events_insert_own on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = host_id);

create policy events_update_own on public.events
  for update
  to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);

create policy events_delete_own on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = host_id);

-- ---------------------------------------------------------------------------
-- ticket_types
-- ---------------------------------------------------------------------------
-- Availability of a published event's ticket types is public.
create policy ticket_types_select_published on public.ticket_types
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.status = 'published'
    )
  );

-- A host manages ticket types for events they own (all commands).
create policy ticket_types_manage_own on public.ticket_types
  for all
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.host_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- orders  (host read-only; writes go through service_role server routes)
-- ---------------------------------------------------------------------------
create policy orders_select_own_event on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- attendees  (the "who's going" directory: host-only, own events, confirmed only)
-- ---------------------------------------------------------------------------
create policy attendees_select_own_event on public.attendees
  for select
  to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = attendees.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- reservations and processed_webhook_events intentionally have NO policies:
-- RLS is enabled with none defined, so anon/authenticated are fully denied.
