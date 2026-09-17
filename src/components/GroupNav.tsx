import Link from 'next/link'
import type { EventGroup } from '@/lib/event-format'

// Persistent, Partiful-style pill navigation to hop between "All events" and each
// group. Sticky so it stays reachable while scrolling; each pill carries the
// group's accent, and the active one is filled with it.
export function GroupNav({ groups, active }: { groups: EventGroup[]; active: string }) {
  const items = [
    { slug: 'all', name: 'All events', href: '/', accent: 'var(--color-primary-700)' },
    ...groups.map((g) => ({
      slug: g.slug,
      name: g.name,
      href: `/g/${g.slug}`,
      accent: g.accent ?? 'var(--color-primary-600)',
    })),
  ]

  return (
    <nav
      aria-label="Event groups"
      className="sticky top-0 z-20 -mx-5 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((it) => {
        const on = it.slug === active
        return (
          <Link
            key={it.slug}
            href={it.href}
            aria-current={on ? 'page' : undefined}
            className={`focus-ring inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              on
                ? 'border-transparent text-white'
                : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
            }`}
            style={on ? { background: it.accent } : undefined}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: on ? 'rgba(255,255,255,0.9)' : it.accent }}
              aria-hidden
            />
            {it.name}
          </Link>
        )
      })}
    </nav>
  )
}
