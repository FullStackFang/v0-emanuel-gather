// Unit tests for the ticket-token crypto. No DB, no framework: run with
//   node --test --experimental-strip-types src/lib/ticket-token.test.ts
// (see package.json "test:unit"). These guard the properties the whole ticket
// security model rests on.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mintToken, hashToken, isWellFormedToken, hashesEqual } from './ticket-token.ts'

test('mintToken yields a 43-char base64url string (256 bits)', () => {
  for (let i = 0; i < 100; i++) {
    const t = mintToken()
    assert.match(t, /^[A-Za-z0-9_-]{43}$/, `unexpected token shape: ${t}`)
  }
})

test('mintToken is effectively unique', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 5000; i++) seen.add(mintToken())
  assert.equal(seen.size, 5000, 'collision in minted tokens')
})

test('hashToken is deterministic, 64 hex chars, and collision-distinct', () => {
  const t = mintToken()
  assert.equal(hashToken(t), hashToken(t), 'hash must be stable for a token')
  assert.match(hashToken(t), /^[0-9a-f]{64}$/, 'sha256 hex expected')
  assert.notEqual(hashToken(mintToken()), hashToken(mintToken()))
})

test('hashToken is not reversible to the token (only the hash is stored)', () => {
  const t = mintToken()
  const h = hashToken(t)
  assert.notEqual(h, t)
  assert.ok(!h.includes(t), 'hash must not embed the raw token')
})

test('isWellFormedToken accepts minted tokens, rejects junk', () => {
  assert.ok(isWellFormedToken(mintToken()))
  for (const bad of ['', 'short', 'a'.repeat(43) + '=', 'has space' + 'x'.repeat(34), null, undefined, 42]) {
    assert.equal(isWellFormedToken(bad as unknown), false, `should reject: ${String(bad)}`)
  }
})

test('hashesEqual compares hex hashes safely', () => {
  const h = hashToken(mintToken())
  assert.ok(hashesEqual(h, h))
  assert.equal(hashesEqual(h, hashToken(mintToken())), false)
  assert.equal(hashesEqual(h, ''), false)
  assert.equal(hashesEqual('', ''), false)
})
