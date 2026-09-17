import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client (uses cookies for session storage so the server
// can read the same session). Safe to use in Client Components.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
