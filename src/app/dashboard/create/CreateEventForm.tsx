'use client'

import { useActionState, useState } from 'react'
import { createEvent, type CreateEventState } from './actions'

// Shared field classes, matching the vocabulary in EventActionBar so host forms
// look identical to the public RSVP form.
const INPUT =
  'focus-ring h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]'
const FIELD_LABEL =
  'font-mono text-2xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]'

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState<CreateEventState, FormData>(createEvent, null)
  const [priceMode, setPriceMode] = useState<'free' | 'paid'>('free')

  return (
    <form action={formAction} className="grid gap-6">
      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Event name</span>
        <input
          name="title"
          required
          maxLength={200}
          autoComplete="off"
          placeholder="Shabbat Dinner"
          className={`${INPUT} font-display text-lg`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Date</span>
          <input name="date" type="date" required className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Start time</span>
          <input name="time" type="time" required className={`${INPUT} font-mono`} />
        </label>
      </div>
      <p className="-mt-3 text-xs text-[var(--text-tertiary)]">
        Times are Eastern (New York). End time isn&rsquo;t stored yet, so events show a
        2-hour default on calendar links.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Location</span>
        <input
          name="location"
          autoComplete="off"
          placeholder="Temple Emanu-El, or a virtual link"
          className={INPUT}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Description</span>
        <textarea
          name="description"
          rows={4}
          placeholder="What should congregants know before they come?"
          className={`${INPUT} h-auto resize-y py-2 leading-relaxed`}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Category</span>
          <input name="category" autoComplete="off" placeholder="Talk, Concert, Service…" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={FIELD_LABEL}>Capacity</span>
          <input
            name="capacity"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="No limit"
            className={INPUT}
          />
        </label>
      </div>

      {/* Ticket price: free by default. Paid reveals an amount; note that paid
          checkout itself is not wired yet (the event page stubs it). */}
      <fieldset className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <legend className={`${FIELD_LABEL} px-1`}>Ticket price</legend>
        <div className="flex gap-2">
          <PriceOption current={priceMode} value="free" onSelect={setPriceMode} label="Free" />
          <PriceOption current={priceMode} value="paid" onSelect={setPriceMode} label="Paid" />
        </div>
        <input type="hidden" name="priceMode" value={priceMode} />
        {priceMode === 'paid' && (
          <label className="flex flex-col gap-1.5">
            <span className={FIELD_LABEL}>Price per ticket (USD)</span>
            <input
              name="priceAmount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="18.00"
              className={`${INPUT} sm:max-w-40`}
            />
            <span className="text-xs text-[var(--text-tertiary)]">
              Online payment isn&rsquo;t live yet; paid events save but can&rsquo;t sell until
              checkout is wired.
            </span>
          </label>
        )}
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className={FIELD_LABEL}>Visibility</span>
        <select name="publish" defaultValue="published" className={INPUT}>
          <option value="published">Publish now (listed publicly)</option>
          <option value="draft">Save as draft (hidden)</option>
        </select>
      </label>

      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--color-error-200)] bg-[var(--color-error-50)] px-3 py-2 text-sm text-[var(--color-error-500)]"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="focus-ring inline-flex h-11 items-center justify-center rounded-lg bg-primary-600 px-6 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Creating…' : 'Create event'}
        </button>
        <a
          href="/dashboard"
          className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}

function PriceOption({
  current,
  value,
  label,
  onSelect,
}: {
  current: 'free' | 'paid'
  value: 'free' | 'paid'
  label: string
  onSelect: (v: 'free' | 'paid') => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`focus-ring h-9 flex-1 rounded-lg border px-4 text-sm font-medium transition-colors ${
        active
          ? 'border-transparent bg-primary-600 text-white shadow-[var(--shadow-primary)]'
          : 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  )
}
