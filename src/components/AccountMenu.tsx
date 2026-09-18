'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { signOut } from '@/app/actions/auth'
import './account-menu.css'

type Props = {
  firstName: string
  fullName: string
  email: string
  initials: string
  avatarUrl: string | null
}

// The signed-in host's account control: an avatar + first name that opens a
// menu (Your events / Profile & settings / Sign out). Closes on outside click
// and Escape.
export function AccountMenu({ firstName, fullName, email, initials, avatarUrl }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const triggerBg = open
    ? 'border-[var(--border-default)] bg-[var(--bg-secondary)]'
    : 'border-transparent hover:border-[var(--border-default)] hover:bg-[var(--bg-secondary)]'

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`am-trigger focus-ring flex items-center gap-2 rounded-full border py-1 pl-1 pr-2 text-[var(--text-secondary)] transition-colors ${triggerBg}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${fullName}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar initials={initials} avatarUrl={avatarUrl} size={32} />
        <span className="hidden text-sm font-semibold text-[var(--text-primary)] sm:inline">
          {firstName}
        </span>
        <svg className="am-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <path
            fill="currentColor"
            className="text-[var(--text-tertiary)]"
            d="M4.2 6.1a.7.7 0 0 1 1 0L8 8.9l2.8-2.8a.7.7 0 1 1 1 1L8.5 10.4a.7.7 0 0 1-1 0L4.2 7.1a.7.7 0 0 1 0-1z"
          />
        </svg>
      </button>

      <div
        className="am-menu absolute right-0 top-[calc(100%+8px)] z-[var(--z-dropdown)] w-64 rounded-xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-1.5 shadow-[var(--shadow-lg)]"
        role="menu"
        data-open={open}
        aria-label="Account"
      >
        <div className="flex items-center gap-3 px-2.5 pb-3 pt-2">
          <Avatar initials={initials} avatarUrl={avatarUrl} size={38} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{fullName}</p>
            <p className="truncate font-mono text-2xs text-[var(--text-tertiary)]">{email}</p>
          </div>
        </div>

        <div className="mx-1 h-px bg-[var(--border-subtle)]" />

        <MenuLink href="/dashboard" onSelect={() => setOpen(false)}>
          <GridIcon />
          Your events
        </MenuLink>
        <MenuLink href="/dashboard/settings" onSelect={() => setOpen(false)}>
          <GearIcon />
          Profile &amp; settings
        </MenuLink>

        <div
          className="mx-2 my-1.5 h-0.5 rounded-full opacity-80"
          style={{
            background:
              'linear-gradient(90deg, var(--color-accent-700), var(--color-accent-400) 40%, transparent)',
          }}
        />

        <form action={signOut}>
          <button
            type="submit"
            role="menuitem"
            className="focus-ring flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-error-50 hover:text-error-700"
          >
            <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0">
              <path fill="currentColor" d="M8 3H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3v-1.7H5a.3.3 0 0 1-.3-.3V5a.3.3 0 0 1 .3-.3h3V3z" />
              <path fill="currentColor" d="m13.3 6.3 2.9 2.9c.4.4.4 1 0 1.4l-2.9 2.9-1.2-1.2 1.4-1.4H8.3V9.6h5.2l-1.4-1.4 1.2-1.2z" />
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}

function MenuLink({
  href,
  onSelect,
  children,
}: {
  href: string
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="focus-ring flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-primary-50 hover:text-[var(--text-brand)] [&:hover>svg]:text-primary-600"
    >
      {children}
    </Link>
  )
}

function GridIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 text-[var(--text-tertiary)] transition-colors">
      <path fill="currentColor" d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" className="shrink-0 text-[var(--text-tertiary)] transition-colors">
      <path fill="currentColor" d="M10 6.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm0 5.1a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z" />
      <path
        fill="currentColor"
        opacity=".32"
        d="M17 10c0-.34-.03-.67-.08-1l1.5-1.16-1.5-2.6-1.77.71a5.9 5.9 0 0 0-1.72-1L13 3h-3l-.42 1.95c-.62.22-1.2.55-1.72 1l-1.77-.71-1.5 2.6L5.09 9c-.05.33-.09.66-.09 1s.04.67.09 1l-1.5 1.16 1.5 2.6 1.77-.71c.52.45 1.1.78 1.72 1L10 17h3l.42-1.95c.62-.22 1.2-.55 1.72-1l1.77.71 1.5-2.6L16.92 11c.05-.33.08-.66.08-1z"
      />
    </svg>
  )
}
