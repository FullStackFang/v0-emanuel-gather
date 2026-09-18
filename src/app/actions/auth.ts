'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Shared sign-out, used by the header account menu and the settings page. In a
// Server Action the Supabase client is allowed to clear the auth cookies (unlike
// in a Server Component), so this fully ends the session before redirecting.
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Ends the session on every device this host has signed in on, then redirects.
export async function signOutEverywhere() {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'global' })
  redirect('/login')
}
