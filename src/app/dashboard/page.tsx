import Link from 'next/link'
import { redirect } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { EventRow } from '@/components/EventRow'
import { StatusPill } from '@/components/StatusPill'
import { createClient } from '@/lib/supabase/server'
import { getHostEvents, viewOf, type EventRecord } from '@/lib/events'

export const dynamic = 'force-dynamic' // a host's own draft/published list is live

type Tab = 'upcoming' | 'past'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'past' ? 'past' : 'upcoming'

  const events = await getHostEvents(user.id)
  // "Ended" is the app's existing notion of past (viewOf compares starts_at to
  // now); reuse it so the dashboard and event pages agree, and to keep the
  // render free of a direct clock read.
  const isPast = (e: EventRecord) => viewOf(e).hasEnded

  // Upcoming (and undated) soonest-first; past most-recent-first.
  const upcoming = events
    .filter((e) => !isPast(e))
    .sort((a, b) => (a.starts_at ?? '').localeCompare(b.starts_at ?? ''))
  const past = events.filter(isPast)
  const shown = tab === 'past' ? past : upcoming

  // The empty upcoming state carries its own primary "Create event" call to
  // action, so the header button would be a duplicate there. Show exactly one.
  const showHeaderCreate = !(tab === 'upcoming' && shown.length === 0)

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <>
      <SiteHeader wide />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-20 pt-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="flex-1 font-display text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Events
          </h1>
          {showHeaderCreate && (
            <Link
              href="/dashboard/create"
              className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700"
            >
              <PlusIcon />
              Create event
            </Link>
          )}
        </div>

        <div className="mb-2 flex items-center gap-1 border-b border-[var(--border-subtle)]">
          <TabLink tab="upcoming" active={tab === 'upcoming'} count={upcoming.length} />
          <TabLink tab="past" active={tab === 'past'} count={past.length} />
        </div>

        {shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {shown.map((event) => (
              <div key={event.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <EventRow event={event} muted={tab === 'past'} />
                </div>
                {event.status !== 'published' && (
                  <span className="shrink-0 rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    {event.status}
                  </span>
                )}
                <Link
                  href={`/dashboard/${event.id}/edit`}
                  className="focus-ring shrink-0 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                >
                  Edit
                </Link>
              </div>
            ))}
          </ul>
        )}

        <form action={signOut} className="mt-12 border-t border-[var(--border-subtle)] pt-6">
          <p className="mb-2 text-xs text-[var(--text-tertiary)]">
            Signed in as {user.email ?? user.id}
          </p>
          <button
            type="submit"
            className="focus-ring rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Sign out
          </button>
        </form>
      </main>
    </>
  )
}

function TabLink({ tab, active, count }: { tab: Tab; active: boolean; count: number }) {
  const label = tab === 'upcoming' ? 'Upcoming' : 'Past'
  return (
    <Link
      href={tab === 'upcoming' ? '/dashboard' : '/dashboard?tab=past'}
      aria-current={active ? 'page' : undefined}
      className={`focus-ring -mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-primary-600 text-[var(--text-primary)]'
          : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
      }`}
    >
      {label}
      <span className="ml-1.5 font-mono text-2xs text-[var(--text-tertiary)]">{count}</span>
    </Link>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border-default)] px-6 py-16 text-center">
      <StatusPill status="available" />
      <div>
        <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
          {tab === 'past' ? 'No past events yet' : 'No upcoming events'}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {tab === 'past'
            ? 'Events move here after they take place.'
            : 'When you host one, it will show up here. Why not start now?'}
        </p>
      </div>
      {tab === 'upcoming' && (
        <Link
          href="/dashboard/create"
          className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700"
        >
          <PlusIcon />
          Create event
        </Link>
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8.722 2.222a.722.722 0 0 0-1.444 0v5.056H2.222a.722.722 0 0 0 0 1.444h5.056v5.056a.722.722 0 0 0 1.444 0V8.722h5.056a.722.722 0 0 0 0-1.444H8.722z"
      />
    </svg>
  )
}
