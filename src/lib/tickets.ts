// Ticket issuance + lookup. SERVER-ONLY: uses the service-role admin client (the
// public ticket page has no anon RLS path; the token is the capability) and node
// crypto. See docs/superpowers/specs/2026-09-17-ticketing-qr-email-design.md.

import { createAdminClient } from '@/lib/supabase/admin'
import { mintToken, hashToken, isWellFormedToken } from '@/lib/ticket-token'
import { ticketUrl, ticketQrUrl } from '@/lib/site-url'
import { sendEmail } from '@/lib/email/send'
import { TicketEmail, type EmailTicket } from '@/emails/TicketEmail'
import { formatEventDate, formatEventTime } from '@/lib/event-format'

export type IssueResult = {
  issued: number
  delivered: boolean
  ticketUrls: string[]
  previewPath?: string
}

// Idempotent: mints a token for every not-yet-issued attendee row of a CONFIRMED
// order, then emails the buyer one message with all newly-minted tickets. Safe to
// call more than once (webhook retries, double submit) -- the guarded UPDATE only
// touches rows that still lack a token, so a repeat call mints nothing and sends
// nothing. Called inline by the free RSVP action today; the future Stripe webhook
// calls the exact same function after confirm_order -- that is the payment seam.
export async function issueTicketsForOrder(orderId: string): Promise<IssueResult> {
  const supabase = createAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, event_id, qty, buyer_email, buyer_name, status')
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr) throw orderErr
  if (!order) throw new Error(`issueTicketsForOrder: order ${orderId} not found`)
  if (order.status !== 'confirmed') return { issued: 0, delivered: false, ticketUrls: [] }

  // Attendee rows for this order that have no token yet, oldest first for stable
  // "Guest i of N" numbering.
  const { data: pending, error: pendingErr } = await supabase
    .from('attendees')
    .select('id')
    .eq('order_id', orderId)
    .is('token_hash', null)
    .order('created_at', { ascending: true })
  if (pendingErr) throw pendingErr
  if (!pending || pending.length === 0) return { issued: 0, delivered: false, ticketUrls: [] }

  const issuedAt = new Date().toISOString()
  const minted: { token: string }[] = []

  for (const row of pending) {
    const token = mintToken()
    // Guard on token_hash IS NULL: if a concurrent call already issued this row,
    // no row matches and we skip it -- never a duplicate token for one seat.
    const { data: updated, error: updErr } = await supabase
      .from('attendees')
      .update({ token_hash: hashToken(token), issued_at: issuedAt })
      .eq('id', row.id)
      .is('token_hash', null)
      .select('id')
      .maybeSingle()
    if (updErr) throw updErr
    if (updated) minted.push({ token })
  }

  if (minted.length === 0) return { issued: 0, delivered: false, ticketUrls: [] }

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('title, starts_at, location')
    .eq('id', order.event_id)
    .maybeSingle()
  if (eventErr) throw eventErr
  if (!event) throw new Error(`issueTicketsForOrder: event ${order.event_id} not found`)

  const total = minted.length
  const tickets: EmailTicket[] = minted.map((m, i) => ({
    token: m.token,
    qrUrl: ticketQrUrl(m.token),
    ticketUrl: ticketUrl(m.token),
    guestLabel: total > 1 ? `Guest ${i + 1} of ${total}` : 'Admit one',
  }))

  const subject =
    total > 1
      ? `Your ${total} tickets for ${event.title}`
      : `Your ticket for ${event.title}`

  const result = await sendEmail({
    to: order.buyer_email,
    subject,
    react: TicketEmail({
      eventTitle: event.title,
      dateLabel: formatEventDate(event.starts_at),
      timeLabel: formatEventTime(event.starts_at),
      location: event.location,
      buyerName: order.buyer_name ?? '',
      tickets,
    }),
  })

  return {
    issued: total,
    delivered: result.delivered,
    ticketUrls: tickets.map((t) => t.ticketUrl),
    previewPath: result.previewPath,
  }
}

export type TicketView = {
  guestName: string | null
  status: 'valid' | 'revoked'
  checkedInAt: string | null
  event: {
    id: string
    title: string
    starts_at: string | null
    location: string | null
    status: string
    category: string | null
  }
}

// Resolve a raw token to its ticket, or null. Structural check first (no DB round
// trip for junk); then match by hash. A malformed token and an unknown-but-valid
// token both return null, so nothing distinguishes them to a prober.
export async function getTicketByToken(token: string): Promise<TicketView | null> {
  if (!isWellFormedToken(token)) return null
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('attendees')
    .select('name, status, checked_in_at, events(id, title, starts_at, location, status, category)')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  // Supabase types the embedded relation as an array; it is a to-one here.
  const ev = (Array.isArray(data.events) ? data.events[0] : data.events) as
    | TicketView['event']
    | undefined
  if (!ev) return null

  return {
    guestName: data.name ?? null,
    status: (data.status as 'valid' | 'revoked') ?? 'valid',
    checkedInAt: data.checked_in_at ?? null,
    event: ev,
  }
}
