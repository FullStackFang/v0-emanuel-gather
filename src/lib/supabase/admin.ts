import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client: full access, BYPASSES Row-Level Security.
// SERVER-ONLY — never import this from a Client Component. It exists so guest
// checkout / RSVP Server Actions can call the SECURITY DEFINER inventory
// functions (reserve_seat / confirm_order), which are granted to service_role
// only. Uses the service_role secret, which must never reach the browser.
let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    // Fail loud and clear rather than silently falling back to the anon key
    // (which the inventory functions REVOKE, producing a confusing error).
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (and the Vercel project env) to enable RSVP/checkout.',
    )
  }
  if (cached) return cached
  cached = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    // No user session here: this client authenticates as service_role, not a person.
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
