import Link from 'next/link'

// Masthead top bar with the Fraunces wordmark and a gold hairline rule. Host
// sign-in points at /dashboard; the proxy bounces unauthenticated visitors to /login.
// `wide` matches the broader explore/listing pages so the wordmark stays aligned.
export function SiteHeader({ wide = false }: { wide?: boolean }) {
  return (
    <header className="bg-[var(--bg-primary)]">
      <div className={`mx-auto w-full px-5 sm:px-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight text-[var(--text-primary)]"
          >
            Emanuel <span className="text-[var(--text-brand)]">Gather</span>
          </Link>
          <Link
            href="/dashboard"
            className="focus-ring rounded-md border-b border-transparent text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            Host sign in
          </Link>
        </div>
        <div
          className="h-0.5 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, var(--color-accent-700), var(--color-accent-400) 40%, transparent)',
          }}
        />
      </div>
    </header>
  )
}
