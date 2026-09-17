// Pure, dependency-free ticket-token crypto. No DB, no env, no framework imports,
// so it is trivially unit-testable and safe to import anywhere server-side.
//
// The token is a bearer credential: whoever holds it can view the ticket and (once
// the scanner exists) be admitted. Two properties make that safe:
//   1. It is unguessable  -- 256 bits from a CSPRNG.
//   2. It is stored hashed -- only sha256(token) ever touches the database, so a
//      leak of the attendees table cannot reproduce a working token/QR.
// See design doc: docs/superpowers/specs/2026-09-17-ticketing-qr-email-design.md.

import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

// 32 bytes = 256 bits of entropy. base64url keeps it URL/QR-safe (no +,/,= or
// percent-encoding), ~43 chars.
const TOKEN_BYTES = 32

export function mintToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Cheap structural gate before we spend a DB round-trip on a lookup. A real token
// is base64url of exactly 32 bytes, which is always 43 chars (no padding). This
// rejects obviously-bogus URLs (empty, oversized, wrong alphabet) without leaking
// anything -- an ill-formed token and a well-formed-but-unknown one both 404.
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_RE.test(token)
}

// Constant-time compare of two hex hashes, for any path that compares a stored
// hash to a recomputed one in application code (the DB lookup uses an index, but
// this is here for correctness-sensitive comparisons).
export function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  if (ba.length !== bb.length || ba.length === 0) return false
  return timingSafeEqual(ba, bb)
}
