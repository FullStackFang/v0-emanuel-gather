'use client'

import { useActionState, useState } from 'react'
import { formatPrice, type EventStatus } from '@/lib/event-format'
import { rsvpToEvent, type RsvpState } from '@/app/e/[id]/actions'

const INPUT =
  'focus-ring h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]'
const FIELD_LABEL =
  'font-mono text-2xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]'

// The RSVP / buy affordance. Free events now RSVP for real (reserve -> confirm,
// no payment); paid checkout (reserve -> Stripe) is not built yet, so that
// branch stays honestly stubbed. Sold-out and ended states are terminal.
export function EventActionBar({
  eventId,
  status,
  isFree,
  minPriceCents,
  seatsLeft,
}: {
  eventId: string
  status: EventStatus
  isFree: boolean
  minPriceCents: number
  seatsLeft: number
}) {
  const [open, setOpen] = useState(false) // free: RSVP form disclosure
  const [noted, setNoted] = useState(false) // paid: "coming soon" stub
  const [state, formAction, pending] = useActionState<RsvpState, FormData>(rsvpToEvent, null)

  const priceLabel = isFree ? 'Free' : formatPrice(minPriceCents)
  const ctaLabel = isFree ? 'RSVP' : 'Get tickets'
  const actionable = status === 'available' || status === 'almost_full'
  const confirmed = !!(state && state.ok)

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] sm:static sm:z-auto sm:rounded-2xl sm:border sm:border-[var(--border-default)] sm:bg-[var(--bg-secondary)] sm:shadow-none">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-3.5 sm:px-6 sm:py-5">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-[var(--text-primary)]">{priceLabel}</span>
          {actionable && !confirmed && (
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
          ) : confirmed ? (
            <span className="text-sm font-semibold text-[var(--text-brand)]">You&rsquo;re going</span>
          ) : isFree ? (
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="focus-ring h-11 rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700"
            >
              {ctaLabel}
            </button>
          ) : (
            <button
              onClick={() => setNoted(true)}
              className="focus-ring h-11 rounded-lg bg-accent-500 px-6 text-sm font-semibold text-[var(--color-accent-900)] shadow-[var(--shadow-accent)] transition-colors hover:bg-accent-600"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      </div>

      {/* Free-event RSVP form (guest checkout: email only, no account) */}
      {isFree && actionable && open && !confirmed && (
        <div className="mx-auto w-full max-w-3xl px-5 pb-4 sm:px-6">
          <form action={formAction} className="grid gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Your name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  placeholder="First and last name"
                  className={INPUT}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={FIELD_LABEL}>Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  className={INPUT}
                />
              </label>
            </div>
            <label className="flex w-full flex-col gap-1 sm:max-w-[10rem]">
              <span className={FIELD_LABEL}>Guests (incl. you)</span>
              <input name="guests" type="number" min={1} max={20} defaultValue={1} className={INPUT} />
            </label>

            {state && !state.ok && (
              <p
                role="alert"
                className="rounded-lg border border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-2 text-sm text-[var(--color-error-500)]"
              >
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="focus-ring inline-flex h-11 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Reserving…' : 'Confirm RSVP'}
            </button>
            <p className="text-xs text-[var(--text-tertiary)]">
              No account needed &mdash; we use your email only to hold your spot.
            </p>
          </form>
        </div>
      )}

      {/* Free-event confirmation */}
      {state && state.ok && (
        <div className="mx-auto w-full max-w-3xl px-5 pb-3.5 sm:px-6 sm:pb-4">
          <p
            role="status"
            className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-[var(--text-brand)]"
          >
            You&rsquo;re in, {state.name.split(' ')[0]}! We&rsquo;ve saved {state.guests}{' '}
            {state.guests === 1 ? 'spot' : 'spots'} under your name. See you there.
          </p>
        </div>
      )}

      {/* Paid checkout: not built yet */}
      {noted && !isFree && (
        <div className="mx-auto w-full max-w-3xl px-5 pb-3.5 sm:px-6 sm:pb-4">
          <p
            role="status"
            className="rounded-lg bg-primary-50 px-3 py-2 text-sm text-[var(--text-brand)]"
          >
            Online ticketing is coming shortly. Check back soon to reserve your place.
          </p>
        </div>
      )}
    </div>
  )
}
