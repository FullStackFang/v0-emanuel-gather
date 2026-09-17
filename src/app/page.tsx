import { SiteHeader } from '@/components/SiteHeader'
import { FeaturedEvent } from '@/components/FeaturedEvent'
import { EventRow } from '@/components/EventRow'
import { getPublishedEvents, viewOf } from '@/lib/events'

export const dynamic = 'force-dynamic' // availability is live; don't cache the list

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1 px-3 font-mono text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
      {children}
    </h2>
  )
}

export default async function Home() {
  const events = await getPublishedEvents()
  const now = new Date()
  const upcoming = events.filter((e) => !viewOf(e, now).hasEnded)
  const past = events.filter((e) => viewOf(e, now).hasEnded).reverse()

  const [featured, ...rest] = upcoming

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 sm:px-6">
        <div className="border-b border-[var(--border-subtle)] py-10 text-center sm:py-14">
          <p className="mb-3.5 font-mono text-xs uppercase tracking-[0.22em] text-[var(--text-accent)]">
            The Streicker Center · Temple Emanu-El
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.02] tracking-tight text-[var(--text-primary)] sm:text-5xl">
            Come, let us gather.
          </h1>
          <p className="mx-auto mt-3 max-w-prose text-[var(--text-secondary)]">
            Gatherings, learning, music, and community &mdash; reserve your place.
          </p>
        </div>

        {upcoming.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-default)] px-6 py-16 text-center">
            <p className="font-display text-xl font-semibold text-[var(--text-primary)]">
              No upcoming events just yet
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Check back soon, or follow a shared link to an event.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <FeaturedEvent event={featured} />
            </div>

            {rest.length > 0 && (
              <section className="mt-10">
                <SectionLabel>Upcoming</SectionLabel>
                <ul className="-mx-3 flex flex-col divide-y divide-[var(--border-subtle)]">
                  {rest.map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {past.length > 0 && (
          <section className="mt-12">
            <SectionLabel>Past</SectionLabel>
            <ul className="-mx-3 flex flex-col divide-y divide-[var(--border-subtle)]">
              {past.map((e) => (
                <EventRow key={e.id} event={e} muted />
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  )
}
