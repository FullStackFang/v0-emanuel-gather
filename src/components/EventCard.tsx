import Link from 'next/link'
import { StatusPill } from '@/components/StatusPill'
import {
  meshFor,
  viewOf,
  formatEventDate,
  formatPrice,
  type EventRecord,
} from '@/lib/event-format'

const DIM = 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.42))'

// Compact "poster" card. Width-agnostic: fills its container, so a rail sizes it
// via a fixed-width wrapper and a grid lets the cell size it. The stained-glass
// mesh is the event's own hue.
export function EventCard({ event }: { event: EventRecord }) {
  const v = viewOf(event)

  return (
    <Link
      href={`/e/${event.id}`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[var(--shadow-xs)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden" style={{ background: meshFor(event.id) }}>
        <div className="absolute inset-0" style={{ background: DIM }} />
        {event.category && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full border border-white/40 bg-black/25 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-white backdrop-blur-sm">
            {event.category}
          </span>
        )}
        <div className="absolute right-3 top-3 z-10">
          <StatusPill status={v.status} seatsLeft={v.availableSeats} variant="cover" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-mono text-2xs uppercase tracking-wider text-[var(--text-tertiary)]">
          {formatEventDate(event.starts_at)}
        </span>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--text-brand)]">
          {event.title}
        </h3>
        <span className="mt-auto pt-1.5 text-sm font-semibold text-[var(--text-primary)]">
          {v.isFree ? 'Free' : formatPrice(v.minPriceCents)}
        </span>
      </div>
    </Link>
  )
}
