import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// OAuth return: Supabase redirects here with ?code=... after Microsoft consent.
// Exchange it for a cookie session, then send the host into the app.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code, or exchange failed: back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
