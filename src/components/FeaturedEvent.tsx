import Link from 'next/link'
import { StatusPill } from '@/components/StatusPill'
import {
  meshFor,
  viewOf,
  formatEventDate,
  formatEventTime,
  formatPrice,
  type EventRecord,
} from '@/lib/event-format'

const DIM = 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.34))'

// The soonest upcoming event, given a full-width stained-glass cover.
export function FeaturedEvent({ event }: { event: EventRecord }) {
  const v = viewOf(event)
  const soldOut = v.status === 'sold_out'

  return (
    <Link
      href={`/e/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[#fffdf8] shadow-[0_14px_30px_-18px_rgba(60,40,10,0.4)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/7] overflow-hidden sm:aspect-[16/6.2]" style={{ background: meshFor(event.id) }}>
        <div className="absolute inset-0" style={{ background: DIM }} />
        <span className="absolute left-4 top-4 z-10 inline-flex items-center rounded-full border border-white/40 bg-black/25 px-2.5 py-1 font-mono text-2xs uppercase tracking-wider text-white backdrop-blur-sm">
          Featured{event.category ? ` · ${event.category}` : ''}
        </span>
        <div className="absolute right-4 top-4 z-10">
          <StatusPill status={v.status} seatsLeft={v.availableSeats} variant="cover" />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 p-5">
          <h2
            className="font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl"
            style={{ textShadow: '0 2px 14px rgba(0,0,0,0.45)' }}
          >
            {event.title}
          </h2>
          <p className="mt-1.5 text-sm text-white/90">
            {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
            {event.location ? ` · ${event.location}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-dashed border-[var(--border-strong)] px-5 py-4">
        <div>
          <div className="font-display text-xl font-semibold text-[var(--text-primary)]">
            {v.isFree ? 'Free' : formatPrice(v.minPriceCents)}
          </div>
          {v.status === 'almost_full' && (
            <div className="text-xs text-[var(--text-tertiary)]">Only {v.availableSeats} left</div>
          )}
        </div>
        {soldOut ? (
          <span className="inline-flex h-11 items-center rounded-lg bg-[var(--color-neutral-200)] px-5 text-sm font-semibold text-[var(--text-tertiary)]">
            Sold out
          </span>
        ) : (
          <span className="inline-flex h-11 items-center rounded-lg bg-accent-500 px-5 text-sm font-semibold text-[var(--color-accent-900)] shadow-[var(--shadow-accent)] transition-colors group-hover:bg-accent-600">
            {v.isFree ? 'RSVP' : 'Get tickets'}
          </span>
        )}
      </div>
    </Link>
  )
}
