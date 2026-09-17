-- Inventory functions: the oversell-safe reservation, the exactly-once order
-- confirmation, and the expiry sweep. All are SECURITY DEFINER with an empty
-- search_path (fully schema-qualified names) per Supabase best practice, and are
-- callable only by service_role -- the server routes invoke them; browsers never do.

-- ---------------------------------------------------------------------------
-- reserve_seat: atomically hold p_qty seats or fail. Design D2.
--
-- The single guarded UPDATE takes a row lock and re-checks availability under it,
-- so concurrent callers serialize on the ticket_types row and can never oversell.
-- Zero rows updated => insufficient inventory => raise (rolls back cleanly).
-- ---------------------------------------------------------------------------
create or replace function public.reserve_seat(
  p_ticket_type_id uuid,
  p_qty            integer,
  p_hold_minutes   integer default 15
)
returns public.reservations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated     integer;
  v_reservation public.reservations;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'qty must be positive' using errcode = '22023';
  end if;

  update public.ticket_types
     set held = held + p_qty
   where id = p_ticket_type_id
     and capacity - sold - held >= p_qty;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    -- Either the ticket type does not exist or there is not enough inventory.
    raise exception 'insufficient_inventory' using errcode = 'P0001';
  end if;

  insert into public.reservations (ticket_type_id, qty, status, expires_at)
  values (p_ticket_type_id, p_qty, 'held', now() + make_interval(mins => p_hold_minutes))
  returning * into v_reservation;

  return v_reservation;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_order: idempotent, exactly-once confirmation. Design D4 + D5.
--
-- 1. Record the provider event id (ON CONFLICT DO NOTHING). If it was already
--    recorded, this is a duplicate delivery -> return with no side effects.
-- 2. Commit held seats -> sold under the capacity invariant.
-- 3. If seats can no longer be committed (hold expired and resold), flag the order
--    needs_refund rather than oversell.
-- The ledger insert and the mutations share this one transaction, so a crash rolls
-- back the marker and the provider's retry reprocesses cleanly.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_order(
  p_order_id          uuid,
  p_provider_event_id text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted  integer;
  v_committed integer;
  v_order     public.orders;
begin
  insert into public.processed_webhook_events (provider_event_id, order_id)
  values (p_provider_event_id, p_order_id)
  on conflict (provider_event_id) do nothing;
  get diagnostics v_inserted = row_count;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    -- Order row should exist before payment (created at checkout start). If it does
    -- not, signal so the caller can 5xx and let the provider retry.
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  -- Duplicate delivery, or already confirmed: no further side effects.
  if v_inserted = 0 or v_order.status = 'confirmed' then
    return v_order;
  end if;

  -- Attempt to commit the held seats. Guarded by held >= qty so a lost/expired hold
  -- cannot drive held negative or breach the capacity invariant.
  update public.ticket_types
     set held = held - v_order.qty,
         sold = sold + v_order.qty
   where id = v_order.ticket_type_id
     and held >= v_order.qty;
  get diagnostics v_committed = row_count;

  if v_committed = 1 then
    update public.reservations
       set status = 'consumed'
     where id = v_order.reservation_id;

    -- One attendee row per seat (shares buyer identity in the guest-checkout MVP;
    -- forward-compatible with per-seat names later).
    insert into public.attendees (event_id, order_id, ticket_type_id, email, name)
    select v_order.event_id, v_order.id, v_order.ticket_type_id, v_order.buyer_email, v_order.buyer_name
    from generate_series(1, v_order.qty);

    update public.orders
       set status = 'confirmed', confirmed_at = now()
     where id = v_order.id
    returning * into v_order;
  else
    -- Late payment after the hold was released and resold: preserve the invariant,
    -- flag for out-of-band refund (issuing the refund is out of scope).
    update public.orders
       set status = 'confirmed', needs_refund = true, confirmed_at = now()
     where id = v_order.id
    returning * into v_order;
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_expired_reservations: authoritative sweep. Design D3.
--
-- Returns seats from expired holds and expires the linked pending order. Uses
-- FOR UPDATE SKIP LOCKED so concurrent sweeps / a sweep racing a confirm never block.
-- Schedule via pg_cron (see companion note) or a Vercel Cron route.
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  r       record;
begin
  for r in
    select id, ticket_type_id, qty
    from public.reservations
    where status = 'held' and expires_at <= now()
    for update skip locked
  loop
    update public.ticket_types
       set held = greatest(held - r.qty, 0)
     where id = r.ticket_type_id;

    update public.reservations set status = 'expired' where id = r.id;

    update public.orders
       set status = 'expired'
     where reservation_id = r.id and status = 'pending';

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Least privilege: these run as their owner and must not be callable by browser roles.
revoke execute on function public.reserve_seat(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.confirm_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
grant execute on function public.reserve_seat(uuid, integer, integer) to service_role;
grant execute on function public.confirm_order(uuid, text) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
