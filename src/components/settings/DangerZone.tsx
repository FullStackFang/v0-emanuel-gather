'use client'

import { useState } from 'react'
import { signOutEverywhere } from '@/app/actions/auth'

// "Sign out of all devices" is the real, safe action a host can take themselves.
// Fully removing host access is admin-managed (see the copy on the settings
// page), because access is granted through their Microsoft account. Uses an
// inline confirm rather than a modal.
export function DangerZone() {
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="focus-ring rounded-lg border border-error-200 bg-[var(--bg-primary)] px-4 py-2 text-sm font-semibold text-error-600 transition-colors hover:border-error-600 hover:bg-error-50"
      >
        Sign out of all devices
      </button>
    )
  }

  return (
    <div className="grid gap-3 rounded-xl border border-error-200 bg-error-50 p-4">
      <p className="text-sm font-semibold text-error-700">Sign out of every device?</p>
      <p className="text-sm text-[var(--text-secondary)]">
        You will need to sign in with Microsoft again on each device, including this one.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <form action={signOutEverywhere}>
          <button
            type="submit"
            className="focus-ring rounded-lg bg-error-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-error-700"
          >
            Yes, sign out everywhere
          </button>
        </form>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="focus-ring rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Keep me signed in
        </button>
      </div>
    </div>
  )
}
