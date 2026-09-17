-- Event ticketing schema: events, ticket types, reservations, orders, attendees,
-- and the webhook-idempotency ledger.
--
-- Correctness cornerstone: ticket_types carries capacity/sold/held counters, and a
-- CHECK constraint makes oversell (sold + held > capacity) impossible at the database
-- level -- no application code path, buggy or not, can violate it. See design D1.
--
-- MVP simplification (surfaced): one order == one reservation == one ticket type + qty.
-- Line items / multi-ticket-type carts are deferred ("work our way up"); the order
-- carries ticket_type_id + qty directly instead of a separate order_items table.

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  description text,
  location    text,
  starts_at   timestamptz,
  status      text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- host_id drives host RLS; status drives public-read RLS. Both are filtered constantly.
create index events_host_id_idx on public.events (host_id);
create index events_status_idx on public.events (status) where status = 'published';

-- ---------------------------------------------------------------------------
-- ticket_types  (inventory lives here)
-- ---------------------------------------------------------------------------
create table public.ticket_types (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  name        text not null check (length(name) between 1 and 120),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency    text not null default 'usd' check (length(currency) = 3),
  capacity    integer not null check (capacity >= 0),
  sold        integer not null default 0,
  held        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- The oversell invariant. This is the safety net behind reserve_seat/confirm_order.
  constraint ticket_types_inventory_ck
    check (sold >= 0 and held >= 0 and sold + held <= capacity)
);

create index ticket_types_event_id_idx on public.ticket_types (event_id);

-- ---------------------------------------------------------------------------
-- reservations  (a transient hold on inventory)
-- ---------------------------------------------------------------------------
create table public.reservations (
  id             uuid primary key default gen_random_uuid(),
  ticket_type_id uuid not null references public.ticket_types (id) on delete cascade,
  qty            integer not null check (qty > 0),
  status         text not null default 'held'
                 check (status in ('held', 'expired', 'consumed', 'cancelled')),
  expires_at     timestamptz not null,
  created_at     timestamptz not null default now()
);

create index reservations_ticket_type_id_idx on public.reservations (ticket_type_id);
-- The sweep scans only live holds that have expired; a partial index keeps it cheap.
create index reservations_sweep_idx on public.reservations (expires_at) where status = 'held';

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  reservation_id uuid unique references public.reservations (id) on delete set null,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  qty            integer not null check (qty > 0),
  buyer_email    text not null,
  buyer_name     text,
  amount_cents   integer not null default 0 check (amount_cents >= 0),
  currency       text not null default 'usd' check (length(currency) = 3),
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'expired', 'cancelled')),
  needs_refund   boolean not null default false,
  -- Payment-provider reference (e.g. Stripe Checkout Session id). Unique so a provider
  -- reference maps to exactly one order.
  provider_ref   text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  confirmed_at   timestamptz
);

create index orders_event_id_idx on public.orders (event_id);
create index orders_ticket_type_id_idx on public.orders (ticket_type_id);

-- ---------------------------------------------------------------------------
-- attendees  (one row per confirmed seat; the "who's going" source)
-- ---------------------------------------------------------------------------
create table public.attendees (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  order_id       uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid references public.ticket_types (id) on delete set null,
  email          text not null,
  name           text,
  created_at     timestamptz not null default now()
);

create index attendees_event_id_idx on public.attendees (event_id);
create index attendees_order_id_idx on public.attendees (order_id);
create index attendees_ticket_type_id_idx on public.attendees (ticket_type_id);

-- ---------------------------------------------------------------------------
-- processed_webhook_events  (exactly-once ledger; see design D4)
-- ---------------------------------------------------------------------------
create table public.processed_webhook_events (
  provider_event_id text primary key,
  order_id          uuid references public.orders (id) on delete set null,
  processed_at      timestamptz not null default now()
);

create index processed_webhook_events_order_id_idx on public.processed_webhook_events (order_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger ticket_types_set_updated_at
  before update on public.ticket_types
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();
