// Verification for the ticket columns on attendees (migration
// 20260917154529_attendee_tickets). Node's built-in test runner + `pg`.
//
//   Local Supabase:  node --test supabase/tests/tickets.test.mjs
//   Other DB:        SUPABASE_DB_URL='postgresql://...:5432/postgres' node --test supabase/tests/tickets.test.mjs
//
// These guard the schema the ticket security model relies on: a token maps to at
// most one attendee (unique hash), unissued rows coexist (many NULLs), and a
// ticket can be revoked. Token MINTING and email live in the app layer
// (src/lib/tickets.ts) and are exercised end-to-end, not here.

import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import pg from 'pg'

const CONN = process.env.SUPABASE_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const pool = new pg.Pool({ connectionString: CONN, max: 10 })

const HOST_ID = '00000000-0000-0000-0000-0000000000bb'
const hash = (t) => createHash('sha256').update(t).digest('hex')

before(async () => {
  await pool.query(
    `insert into auth.users (id, email) values ($1, 'tickethost@example.com')
     on conflict (id) do nothing`,
    [HOST_ID],
  )
})

after(async () => {
  await pool.query(`delete from auth.users where id = $1`, [HOST_ID])
  await pool.end()
})

beforeEach(async () => {
  await pool.query(`delete from public.events where host_id = $1`, [HOST_ID])
})

// Confirmed order of `qty` free seats -> `qty` attendee rows with NULL token_hash.
async function seedConfirmedOrder(qty) {
  const ev = await pool.query(
    `insert into public.events (host_id, title, status) values ($1, 'Ticket Test', 'published') returning id`,
    [HOST_ID],
  )
  const eventId = ev.rows[0].id
  const tt = await pool.query(
    `insert into public.ticket_types (event_id, name, price_cents, capacity)
     values ($1, 'GA', 0, 100) returning id`,
    [eventId],
  )
  const ticketTypeId = tt.rows[0].id
  const res = await pool.query('select id from public.reserve_seat($1, $2)', [ticketTypeId, qty])
  const ord = await pool.query(
    `insert into public.orders (event_id, reservation_id, ticket_type_id, qty, buyer_email, amount_cents)
     values ($1, $2, $3, $4, 'buyer@example.com', 0) returning id`,
    [eventId, res.rows[0].id, ticketTypeId, qty],
  )
  const orderId = ord.rows[0].id
  await pool.query('select public.confirm_order($1, $2)', [orderId, `free:${orderId}`])
  return { eventId, orderId }
}

test('confirmed attendees start unissued (NULL token_hash) and default to valid', async () => {
  const { orderId } = await seedConfirmedOrder(3)
  const { rows } = await pool.query(
    'select token_hash, status from public.attendees where order_id = $1',
    [orderId],
  )
  assert.equal(rows.length, 3)
  assert.ok(rows.every((r) => r.token_hash === null), 'no tokens before issuance')
  assert.ok(rows.every((r) => r.status === 'valid'), 'default status is valid')
})

test('issuing distinct tokens to each seat succeeds; a duplicate hash is rejected', async () => {
  const { orderId } = await seedConfirmedOrder(2)
  const ids = (
    await pool.query('select id from public.attendees where order_id = $1 order by created_at', [orderId])
  ).rows.map((r) => r.id)

  const h1 = hash(randomBytes(32).toString('base64url'))
  const h2 = hash(randomBytes(32).toString('base64url'))
  await pool.query('update public.attendees set token_hash = $1, issued_at = now() where id = $2', [h1, ids[0]])
  await pool.query('update public.attendees set token_hash = $1, issued_at = now() where id = $2', [h2, ids[1]])

  // The unique index must forbid reusing a token hash across seats.
  await assert.rejects(
    () => pool.query('update public.attendees set token_hash = $1 where id = $2', [h1, ids[1]]),
    /duplicate key value|unique/i,
    'duplicate token_hash must be rejected',
  )
})

test('an invalid status is rejected by the check constraint', async () => {
  const { orderId } = await seedConfirmedOrder(1)
  const id = (await pool.query('select id from public.attendees where order_id = $1', [orderId])).rows[0].id
  await assert.rejects(
    () => pool.query('update public.attendees set status = $1 where id = $2', ['bogus', id]),
    /violates check constraint/i,
  )
  // Revoking to a legal value works.
  await pool.query('update public.attendees set status = $1 where id = $2', ['revoked', id])
  const { rows } = await pool.query('select status from public.attendees where id = $1', [id])
  assert.equal(rows[0].status, 'revoked')
})
