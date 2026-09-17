import Link from 'next/link'
import { EventCard } from '@/components/EventCard'
import type { EventGroup, EventRecord } from '@/lib/event-format'

// One organizing group as a browse row: a header (name -> its landing page,
// tagline, "See all") and a horizontal, snap-scrolling row of poster cards.
export function GroupRail({ group, events }: { group: EventGroup; events: EventRecord[] }) {
  if (events.length === 0) return null
  const accent = group.accent ?? 'var(--color-primary-600)'

  return (
    <section className="mt-12">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/g/${group.slug}`} className="focus-ring group inline-flex items-center gap-2 rounded-md">
            <span className="h-4 w-1 rounded-full" style={{ background: accent }} aria-hidden />
            <h2 className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--text-brand)]">
              {group.name}
            </h2>
          </Link>
          {group.tagline && (
            <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">{group.tagline}</p>
          )}
        </div>
        <Link
          href={`/g/${group.slug}`}
          className="focus-ring shrink-0 rounded-md text-sm font-medium text-[var(--text-brand)] hover:underline"
        >
          See all &rarr;
        </Link>
      </div>

      <div className="-mx-5 flex snap-x gap-4 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((e) => (
          <div key={e.id} className="w-60 shrink-0 snap-start">
            <EventCard event={e} />
          </div>
        ))}
      </div>
    </section>
  )
}
