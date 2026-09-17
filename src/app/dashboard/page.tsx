import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Host dashboard placeholder — proves an authenticated session round-trips.
// The proxy already redirects unauthenticated users here; this is defense in depth.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Signed in
        </h1>
        <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
          {user.email ?? user.id}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 8,
              border: '1px solid rgba(128,128,128,0.35)',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}
