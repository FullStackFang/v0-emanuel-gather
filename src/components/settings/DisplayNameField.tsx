'use client'

import { useRef, useState, useTransition } from 'react'
import { updateDisplayName } from '@/app/dashboard/settings/actions'

type Status = 'idle' | 'saving' | 'saved' | 'error'

// Display name with an optimistic, save-on-blur feel: leave the field (or press
// Enter) and it saves, showing a quiet "Saving…" then "Saved" tick. No button.
export function DisplayNameField({ initialName }: { initialName: string }) {
  const [value, setValue] = useState(initialName)
  const savedRef = useRef(initialName)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function save() {
    const next = value.trim()
    if (next === savedRef.current) {
      setValue(next)
      return
    }
    setStatus('saving')
    setError(null)
    startTransition(async () => {
      const res = await updateDisplayName(next)
      if (res.ok) {
        savedRef.current = next
        setValue(next)
        setStatus('saved')
        if (clearTimer.current) clearTimeout(clearTimer.current)
        clearTimer.current = setTimeout(() => setStatus('idle'), 2400)
      } else {
        setStatus('error')
        setError(res.error)
      }
    })
  }

  return (
    <div className="grid gap-1.5">
      <label htmlFor="displayName" className="text-sm font-semibold text-[var(--text-secondary)]">
        Display name
      </label>
      <div className="flex items-center gap-3">
        <input
          id="displayName"
          type="text"
          value={value}
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          aria-invalid={status === 'error'}
          className="focus-ring h-10 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-primary)] px-3 text-[15px] text-[var(--text-primary)] transition-colors focus:border-primary-500 focus:outline-none"
        />
        <SaveStatus status={status} />
      </div>
      {error && (
        <p role="alert" className="text-xs text-error-600">
          {error}
        </p>
      )}
    </div>
  )
}

function SaveStatus({ status }: { status: Status }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-[var(--text-tertiary)]">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--text-tertiary)]" />
        Saving
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-success-600">
        <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M6.2 10.6 3.5 8l-1 1 3.7 3.6L14 5.8l-1-1z" />
        </svg>
        Saved
      </span>
    )
  }
  return null
}
