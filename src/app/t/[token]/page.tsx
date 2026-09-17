import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/SiteHeader'
import { getTicketByToken } from '@/lib/tickets'
import { qrSvg } from '@/lib/qr'
import { ticketUrl } from '@/lib/site-url'
import {
  meshFor,
  formatEventDate,
  formatEventTime,
  googleCalendarUrl,
} from '@/lib/event-format'

// A ticket is a live thing (it can be checked in or revoked), and its URL carries
// a bearer token, so never cache and never let search engines index it.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your ticket · Emanuel Gather',
  robots: { index: false, follow: false },
}

const DIM = 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.48))'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-2xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ticket = await getTicketByToken(token)
  if (!ticket) notFound()

  const { event } = ticket
  const revoked = ticket.status === 'revoked'
  const checkedIn = !revoked && !!ticket.checkedInAt
  const cancelledEvent = event.status === 'cancelled'

  // The QR always encodes this same page's URL; a door scanner reads the token
  // from it. Even a void ticket keeps its code (the page it opens tells the story).
  const svg = await qrSvg(ticketUrl(token))
  const calUrl = googleCalendarUrl({
    title: event.title,
    starts_at: event.starts_at,
    location: event.location,
  })

  const state: { label: string; cls: string; note: string } = revoked
    ? {
        label: 'Void',
        cls: 'bg-[var(--color-error-50)] text-[var(--color-error-600)]',
        note: 'This ticket was cancelled and is no longer valid.',
      }
    : checkedIn
      ? {
          label: 'Checked in',
          cls: 'bg-[var(--color-neutral-100)] text-[var(--text-secondary)]',
          note: `Welcomed at ${formatEventTime(ticket.checkedInAt)} on ${formatEventDate(ticket.checkedInAt)}.`,
        }
      : {
          label: 'Valid',
          cls: 'bg-[var(--color-success-50)] text-[var(--color-success-700)]',
          note: 'Show this QR code at the door. No app or account needed.',
        }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-16 pt-4 sm:pt-6">
        <Link
          href={`/e/${event.id}`}
          className="focus-ring inline-flex items-center gap-1 self-start rounded-md text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <span aria-hidden>&larr;</span> Event details
        </Link>

        <article className="ticket-materialize mt-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)]">
          {/* Stained-glass cover */}
          <div
            className="relative flex aspect-[16/7] flex-col justify-between p-4"
            style={{ background: meshFor(event.id) }}
          >
            <div className="absolute inset-0" style={{ background: DIM }} />
            {event.category && (
              <span className="relative z-10 inline-flex w-fit items-center rounded-full border border-white/40 bg-black/25 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-white backdrop-blur-sm">
                {event.category}
              </span>
            )}
            <div className="relative z-10">
              <h1
                className="font-display text-2xl font-semibold leading-tight tracking-tight text-white"
                style={{ textShadow: '0 2px 14px rgba(0,0,0,0.5)' }}
              >
                {event.title}
              </h1>
              <p className="mt-1 text-sm text-white/90">Hosted by Temple Emanu-El</p>
            </div>
          </div>

          {/* Event facts */}
          <div className="flex flex-wrap gap-x-8 gap-y-4 px-6 py-5">
            <Fact label="Date" value={formatEventDate(event.starts_at)} />
            <Fact label="Time" value={formatEventTime(event.starts_at) || 'TBA'} />
            {event.location && <Fact label="Location" value={event.location} />}
          </div>

          {/* Tear line */}
          <div className="ticket-perf" aria-hidden />

          {/* Admit / QR */}
          <div className="flex flex-col items-center gap-4 px-6 pb-7 pt-6 text-center">
            <span className="font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Admit one
            </span>

            <div
              className={`rounded-2xl border border-[var(--border-subtle)] bg-white p-3 shadow-[var(--shadow-xs)] ${
                revoked ? 'opacity-30 grayscale' : ''
              }`}
            >
              <div
                className="h-44 w-44 [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>

            {ticket.guestName && (
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {ticket.guestName}
              </p>
            )}

            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-mono text-2xs font-semibold uppercase tracking-wide ${state.cls}`}
            >
              {state.label}
            </span>

            <p className="max-w-xs text-sm text-[var(--text-secondary)]">
              {cancelledEvent && !revoked
                ? 'This event has been cancelled. Please check your email for details.'
                : state.note}
            </p>

            {!revoked && !checkedIn && calUrl && (
              <a
                href={calUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring rounded-md text-sm font-semibold text-[var(--text-brand)] underline-offset-4 hover:underline"
              >
                Add to calendar
              </a>
            )}
          </div>
        </article>

        <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          Temple Emanu-El · Come, let us gather.
        </p>
      </main>
    </>
  )
}
