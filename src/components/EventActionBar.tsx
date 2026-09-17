'use client'

import { useState } from 'react'
import { formatPrice, type EventStatus } from '@/lib/event-format'

// The RSVP / buy affordance. Ticketing checkout (reserve -> Stripe) is not built
// yet, so the primary action is honestly stubbed: it opens a short note instead
// of pretending to sell. Sold-out and ended states are terminal (no action).
export function EventActionBar({
  status,
  isFree,
  minPriceCents,
  seatsLeft,
}: {
  status: EventStatus
  isFree: boolean
  minPriceCents: number
  seatsLeft: number
}) {
  const [noted, setNoted] = useState(false)

  const priceLabel = isFree ? 'Free' : formatPrice(minPriceCents)
  const ctaLabel = isFree ? 'RSVP' : 'Get tickets'
  const actionable = status === 'available' || status === 'almost_full'

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] sm:static sm:z-auto sm:rounded-2xl sm:border sm:border-[var(--border-default)] sm:bg-[var(--bg-secondary)] sm:shadow-none">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-3.5 sm:px-6 sm:py-5">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-[var(--text-primary)]">{priceLabel}</span>
          {actionable && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {status === 'almost_full' ? `Only ${seatsLeft} left` : `${seatsLeft} spots open`}
            </span>
          )}
        </div>

        <div className="ml-auto">
          {status === 'ended' ? (
            <span className="text-sm font-medium text-[var(--text-tertiary)]">
              This event has ended
            </span>
          ) : status === 'sold_out' ? (
            <button
              disabled
              className="h-11 cursor-not-allowed rounded-lg bg-[var(--color-neutral-200)] px-6 text-sm font-semibold text-[var(--text-tertiary)]"
            >
              Sold out
            </button>
          ) : (
            <button
              onClick={() => setNoted(true)}
              className={`focus-ring h-11 rounded-lg px-6 text-sm font-semibold transition-colors ${
                isFree
                  ? 'bg-primary-600 text-white shadow-[var(--shadow-primary)] hover:bg-primary-700'
                  : 'bg-accent-500 text-[var(--color-accent-900)] shadow-[var(--shadow-accent)] hover:bg-accent-600'
              }`}
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>

      {noted && (
        <div className="mx-auto w-full max-w-3xl px-5 pb-3.5 sm:px-6 sm:pb-4">
          <p
            role="status"
            className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-[var(--text-brand)]"
          >
            Online {isFree ? 'RSVP' : 'ticketing'} is coming shortly. Check back soon to reserve
            your place.
          </p>
        </div>
      )}
    </div>
  )
}
