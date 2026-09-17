-- Event groups: an organizing "program" (The Streicker Center, Interfaith, ...)
-- an event can belong to. Powers grouped browsing on the home page and a
-- per-group landing page with its own flavor (accent, tagline, blurb).
create table if not exists public.event_groups (
  slug        text primary key check (slug ~ '^[a-z0-9-]+$'),
  name        text not null check (char_length(name) between 1 and 120),
  tagline     text,
  blurb       text,
  accent      text,                             -- hex color for the group's flavor
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

alter table public.events
  add column if not exists group_slug text
    references public.event_groups(slug) on delete set null;

create index if not exists events_group_slug_idx on public.events(group_slug);

-- Groups are public reference data: anyone may read; writes go through service_role.
alter table public.event_groups enable row level security;
alter table public.event_groups force row level security;
create policy event_groups_select_all on public.event_groups
  for select to anon, authenticated using (true);
