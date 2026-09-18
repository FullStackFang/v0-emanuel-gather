import type { User } from '@supabase/supabase-js'

// A host's display identity, derived from the Supabase auth user. Hosts sign in
// with Microsoft, so name/photo originate there; the display name and
// notification prefs below are stored in auth user_metadata (no profiles table).
// Pure and client-safe: the header (server) derives this and passes the pieces
// it needs to the client AccountMenu.
export type HostProfile = {
  fullName: string
  firstName: string
  email: string
  initials: string
  avatarUrl: string | null
  notifyRsvp: boolean
  notifyWeekly: boolean
  lastSignInAt: string | null
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

// "sarah.adler@templeemanuel.org" -> "Sarah Adler". A friendly fallback when
// the Microsoft profile didn't return a name (the app requests only the email
// scope), so the header never has to show a raw address.
function prettyFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

function initialsFrom(name: string, email: string): string {
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
    const combined = (first + last).toUpperCase()
    if (combined) return combined
  }
  const local = (email.split('@')[0] ?? '').replace(/[^a-zA-Z]/g, '')
  return (local.slice(0, 2) || 'H').toUpperCase()
}

export function hostProfileFrom(user: User): HostProfile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const email = user.email ?? ''
  const metaName = str(meta.full_name) || str(meta.name)
  const fullName = metaName || prettyFromEmail(email) || 'Host'

  return {
    fullName,
    firstName: fullName.split(/\s+/)[0] || fullName,
    email,
    initials: initialsFrom(metaName, email),
    avatarUrl: str(meta.avatar_url) || str(meta.picture) || null,
    // Default on for RSVP alerts, off for the weekly digest.
    notifyRsvp: meta.notify_rsvp !== false,
    notifyWeekly: meta.notify_weekly === true,
    lastSignInAt: user.last_sign_in_at ?? null,
  }
}
