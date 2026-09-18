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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-default)] bg-[var(--bg-primary)] shadow-[var(--shadow-lg)] sm:static sm:z-auto sm:rounded-2xl sm:border sm:border-[var(--border-default)] sm:shadow-[var(--shadow-md)]">
      {/* Card header — desktop rail only; the mobile bar leads straight with price */}
      <div className="hidden items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-3.5 sm:flex">
        <span className="font-mono text-2xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {isFree ? 'Register' : 'Get tickets'}
        </span>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-wide text-[var(--text-brand)]">
          {priceLabel}
        </span>
      </div>

      <div className="px-5 py-3.5 sm:px-6 sm:py-5">
        {/* Price + CTA: one row on the mobile bar, stacked in the desktop card */}
        <div className="flex items-center gap-4 sm:flex-col sm:items-stretch">
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-[var(--text-primary)] sm:font-display sm:text-2xl">
              {priceLabel}
            </span>
            {actionable && !confirmed && (
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500 shadow-[0_0_0_3px_var(--color-accent-50)]" />
                {status === 'almost_full' ? `Only ${seatsLeft} left` : `${seatsLeft} spots open`}
              </span>
            )}
          </div>

          <div className="ml-auto sm:ml-0">
            {status === 'ended' ? (
              <span className="block text-sm font-medium text-[var(--text-tertiary)] sm:py-1">
                This event has ended
              </span>
            ) : status === 'sold_out' ? (
              <button
                disabled
                className="h-11 w-full cursor-not-allowed rounded-lg bg-[var(--color-neutral-200)] px-6 text-sm font-semibold text-[var(--text-tertiary)]"
              >
                Sold out
              </button>
            ) : confirmed ? (
              <span className="block text-sm font-semibold text-[var(--text-brand)] sm:py-1">
                You&rsquo;re going
              </span>
            ) : isFree ? (
              <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="focus-ring h-11 w-full rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700"
              >
                {ctaLabel}
              </button>
            ) : (
              <button
                onClick={() => setNoted(true)}
                className="focus-ring h-11 w-full rounded-lg bg-accent-500 px-6 text-sm font-semibold text-[var(--color-accent-900)] shadow-[var(--shadow-accent)] transition-colors hover:bg-accent-600"
              >
                {ctaLabel}
              </button>
            )}
          </div>
        </div>

        {/* Free-event RSVP form (guest checkout: email only, no account) */}
        {isFree && actionable && open && !confirmed && (
          <form action={formAction} className="mt-4 grid gap-3">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
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
            <label className="flex w-full flex-col gap-1 sm:max-w-[10rem] lg:max-w-none">
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
              className="focus-ring inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? 'Reserving…' : 'Confirm RSVP'}
            </button>
            <p className="text-xs text-[var(--text-tertiary)]">
              No account needed. We use your email only to hold your spot.
            </p>
          </form>
        )}

        {/* Free-event confirmation — a single gold sheen on the moment it lands */}
        {state && state.ok && (
          <div
            role="status"
            className="reg-shimmer mt-4 flex flex-col gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-[var(--text-brand)]"
          >
            <span>
              You&rsquo;re in, {state.name.split(' ')[0]}!{' '}
              {state.emailed
                ? `We emailed your ${state.guests === 1 ? 'ticket' : `${state.guests} tickets`}.`
                : `We saved ${state.guests === 1 ? 'your spot' : `${state.guests} spots`}; your ${
                    state.guests === 1 ? 'ticket is' : 'tickets are'
                  } ready.`}
            </span>
            {state.ticketUrl && (
              <a
                href={state.ticketUrl}
                className="focus-ring shrink-0 font-semibold underline underline-offset-4"
              >
                View {state.guests === 1 ? 'ticket' : 'your first ticket'} &rarr;
              </a>
            )}
          </div>
        )}

        {/* Paid checkout: not built yet */}
        {noted && !isFree && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-primary-50 px-3 py-2 text-sm text-[var(--text-brand)]"
          >
            Online ticketing is coming shortly. Check back soon to reserve your place.
          </p>
        )}
      </div>
    </div>
  )
}
