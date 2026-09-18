'use client'

import { useRef, useState, useTransition } from 'react'
import { updateNotifications } from '@/app/dashboard/settings/actions'

// Two email preferences, saved optimistically the moment a switch flips, with a
// quiet shared "Saved" confirmation. On failure the switch rolls back.
export function NotificationSettings({
  initialRsvp,
  initialWeekly,
}: {
  initialRsvp: boolean
  initialWeekly: boolean
}) {
  const [rsvp, setRsvp] = useState(initialRsvp)
  const [weekly, setWeekly] = useState(initialWeekly)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function persist(nextRsvp: boolean, nextWeekly: boolean, rollback: () => void) {
    setError(null)
    startTransition(async () => {
      const res = await updateNotifications({ notifyRsvp: nextRsvp, notifyWeekly: nextWeekly })
      if (res.ok) {
        setSaved(true)
        if (savedTimer.current) clearTimeout(savedTimer.current)
        savedTimer.current = setTimeout(() => setSaved(false), 1800)
      } else {
        rollback()
        setError(res.error)
      }
    })
  }

  return (
    <div>
      <div className="mb-1 flex h-5 items-center">
        <SavedPill show={saved} />
        {error && (
          <span role="alert" className="text-xs text-error-600">
            {error}
          </span>
        )}
      </div>

      <ToggleRow
        id="notify-rsvp"
        title="New RSVPs and ticket sales"
        description="Email me whenever someone signs up for one of my events."
        checked={rsvp}
        onChange={(next) => {
          setRsvp(next)
          persist(next, weekly, () => setRsvp(!next))
        }}
      />
      <ToggleRow
        id="notify-weekly"
        title="Weekly summary"
        description="A Monday morning digest of the week's upcoming events."
        checked={weekly}
        onChange={(next) => {
          setWeekly(next)
          persist(rsvp, next, () => setWeekly(!next))
        }}
      />
    </div>
  )
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string
  title: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <div className="flex items-center gap-4 border-t border-[var(--border-subtle)] py-3.5 first:border-t-0">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[15px] font-semibold text-[var(--text-primary)]">{title}</span>
        <span className="mt-0.5 block text-[13px] text-[var(--text-tertiary)]">{description}</span>
      </label>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-primary-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-500" />
        <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform peer-checked:translate-x-5" />
      </span>
    </div>
  )
}

function SavedPill({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden={!show}
      className={`inline-flex items-center gap-1 font-mono text-2xs font-semibold text-success-600 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
        <path fill="currentColor" d="M6.2 10.6 3.5 8l-1 1 3.7 3.6L14 5.8l-1-1z" />
      </svg>
      Saved
    </span>
  )
}
