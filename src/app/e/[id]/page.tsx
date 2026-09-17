import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/SiteHeader'
import { StatusPill } from '@/components/StatusPill'
import { EventActionBar } from '@/components/EventActionBar'
import { getEvent } from '@/lib/events'
import { meshFor, viewOf, formatEventDate, formatEventTime } from '@/lib/event-format'

export const dynamic = 'force-dynamic' // availability is live

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) return { title: 'Event not found · Emanuel Gather' }
  return {
    title: `${event.title} · Emanuel Gather`,
    description: event.description ?? undefined,
  }
}

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

const DIM = 'linear-gradient(180deg, rgba(0,0,0,0.10), rgba(0,0,0,0.44))'

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)
  if (!event) notFound()

  const v = viewOf(event)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-28 pt-4 sm:px-6 sm:pb-16 sm:pt-6">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <span aria-hidden>&larr;</span> All events
        </Link>

        {/* Stained-glass hero */}
        <div
          className="relative mt-4 aspect-[16/8] overflow-hidden rounded-2xl sm:aspect-[16/6.5]"
          style={{ background: meshFor(event.id) }}
        >
          <div className="absolute inset-0" style={{ background: DIM }} />
          {event.category && (
            <span className="absolute left-4 top-4 z-10 inline-flex items-center rounded-full border border-white/40 bg-black/25 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-white backdrop-blur-sm">
              {event.category}
            </span>
          )}
          <div className="absolute right-4 top-4 z-10">
            <StatusPill status={v.status} seatsLeft={v.availableSeats} variant="cover" />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
            <h1
              className="font-display text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl"
              style={{ textShadow: '0 2px 16px rgba(0,0,0,0.5)' }}
            >
              {event.title}
            </h1>
            <p className="mt-2 text-sm text-white/90">Hosted by Temple Emanu-El</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 border-b border-[var(--border-subtle)] pb-8 sm:grid-cols-3">
          <Fact label="Date" value={formatEventDate(event.starts_at)} />
          <Fact label="Time" value={formatEventTime(event.starts_at) || 'TBA'} />
          {event.location && <Fact label="Location" value={event.location} />}
        </div>

        {event.description && (
          <div className="mt-8 max-w-prose whitespace-pre-line leading-relaxed text-[var(--text-primary)]">
            {event.description}
          </div>
        )}

        <div className="mt-10">
          <EventActionBar
            eventId={event.id}
            status={v.status}
            isFree={v.isFree}
            minPriceCents={v.minPriceCents}
            seatsLeft={v.availableSeats}
          />
        </div>
      </main>
    </>
  )
}
