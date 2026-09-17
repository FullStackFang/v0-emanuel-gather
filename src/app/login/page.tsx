'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const hasError =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('error') === 'auth'

  async function signInWithMicrosoft() {
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email',
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setLoading(false)
      console.error(error)
    }
    // On success the browser is redirected to Microsoft; nothing else to do.
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Emanuel Gather
        </h1>
        <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>Host sign in</p>

        {hasError && (
          <p style={{ color: '#b91c1c', marginBottom: '1rem' }}>
            Sign-in failed. Please try again.
          </p>
        )}

        <button
          onClick={signInWithMicrosoft}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            border: '1px solid rgba(128,128,128,0.35)',
            fontSize: '1rem',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Redirecting…' : 'Sign in with Microsoft'}
        </button>
      </div>
    </main>
  )
}
