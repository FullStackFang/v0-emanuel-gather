'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { viewOf, type EventRecord } from '@/lib/event-format'

// Same shape event data is read with elsewhere; kept local so the action stays
// server-authoritative and never trusts values the client sent for pricing.
const SELECT =
  'id,title,description,location,starts_at,status,category,group_slug,ticket_types(id,name,price_cents,capacity,sold,held)'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PARTY = 20

export type RsvpState =
  | { ok: true; guests: number; name: string }
  | { ok: false; error: string }
  | null

// Free-event RSVP. This is a public POST endpoint (Server Actions are reachable
// directly, not just via our UI), so every check is re-done here against the
// database — the client's "isFree" claim is never trusted.
export async function rsvpToEvent(_prev: RsvpState, formData: FormData): Promise<RsvpState> {
  const eventId = String(formData.get('eventId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const guests = Number.parseInt(String(formData.get('guests') ?? '1'), 10)

  if (!name) return { ok: false, error: 'Please enter your name.' }
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Please enter a valid email address.' }
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_PARTY)
    return { ok: false, error: `Guest count must be between 1 and ${MAX_PARTY}.` }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('events')
    .select(SELECT)
    .eq('id', eventId)
    .maybeSingle()
  if (error) throw error
  const event = data as EventRecord | null
  if (!event || event.status !== 'published')
    return { ok: false, error: 'This event is no longer available.' }

  // Server-side truth for free / ended, using the same helper the page renders with.
  const v = viewOf(event)
  if (!v.isFree) return { ok: false, error: 'This event requires tickets, not a free RSVP.' }
  if (v.hasEnded) return { ok: false, error: 'This event has already taken place.' }

  // A free event's ticket types are all $0; prefer one that can hold the whole
  // party outright, else fall back so reserve_seat gives the definitive answer.
  const ticket =
    event.ticket_types.find(
      (t) => t.price_cents === 0 && t.capacity - t.sold - t.held >= guests,
    ) ?? event.ticket_types.find((t) => t.price_cents === 0)
  if (!ticket) return { ok: false, error: 'No free tickets are configured for this event.' }

  // Hold seats atomically. reserve_seat re-checks capacity under a row lock, so
  // this is the real (oversell-safe) capacity gate — the checks above are UX.
  const { data: reservation, error: reserveErr } = await supabase.rpc('reserve_seat', {
    p_ticket_type_id: ticket.id,
    p_qty: guests,
  })
  if (reserveErr) {
    if (reserveErr.code === 'P0001' || reserveErr.message?.includes('insufficient_inventory'))
      return { ok: false, error: 'Sorry — there aren’t enough spots left for that many guests.' }
    throw reserveErr
  }

  // Create the zero-cost order tied to the hold, then confirm it immediately
  // (free events have no Stripe webhook to do this). confirm_order commits
  // held -> sold and writes one attendee row per seat; it is idempotent.
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      event_id: event.id,
      reservation_id: (reservation as { id: string }).id,
      ticket_type_id: ticket.id,
      qty: guests,
      buyer_email: email,
      buyer_name: name,
      amount_cents: 0,
      status: 'pending',
    })
    .select('id')
    .single()
  if (orderErr) throw orderErr

  const orderId = (order as { id: string }).id
  const { error: confirmErr } = await supabase.rpc('confirm_order', {
    p_order_id: orderId,
    p_provider_event_id: `free:${orderId}`, // synthetic, unique per order (no payment provider)
  })
  if (confirmErr) throw confirmErr

  // The event page is force-dynamic, but revalidate so any cached view reflects
  // the seats we just took.
  revalidatePath(`/e/${event.id}`)
  return { ok: true, guests, name }
}
