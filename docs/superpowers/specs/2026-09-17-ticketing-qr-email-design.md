# Ticketing → QR → Email — Design

Date: 2026-09-17
Status: Approved (short-spec path); implementation to follow.

## Goal

After a congregant RSVPs to a **free** event, issue each guest a real ticket:
a ticket web page and an emailed ticket, each carrying a scannable QR code.
Built so that **paid** checkout (Stripe) can reuse the exact same issuance path
later with no rework, and so a host door-scanner can be added later without
schema changes.

## Context (already built — do not rebuild)

- Inventory-safe schema: `events`, `ticket_types` (DB-level oversell invariant),
  `reservations`, `orders`, `attendees`, `processed_webhook_events`.
- `reserve_seat` / `confirm_order` (exactly-once) / `release_expired_reservations`,
  all `SECURITY DEFINER`, service-role only, behind forced RLS.
- Free RSVP (`src/app/e/[id]/actions.ts` → `rsvpToEvent`) already does
  reserve → order → `confirm_order`, which writes **one `attendees` row per seat**.
- `confirm_order` is the single confirmation choke point for both free and (future)
  paid orders. Ticket issuance hangs off its success.

## Decisions

- **Ticket granularity:** one ticket per guest (one `attendees` row = one ticket = one QR).
- **Scope now:** ticket page + emailed ticket + QR. Host camera-scanner and the
  check-in mutation are deferred, but the schema/token are check-in-ready.
- **Email provider:** Resend + React Email. Requires the user's account + a verified
  sending domain. A dev transport (log + rendered-HTML preview file) stands in until
  `RESEND_API_KEY` is set — swapped by config, not a permanent mock.
- **QR library:** `qrcode` (node-qrcode), MIT, server-side PNG.

## Data model

A ticket is a confirmed attendee. Extend `attendees` (new migration only):

| column          | type          | notes                                             |
|-----------------|---------------|---------------------------------------------------|
| `token_hash`    | text unique   | SHA-256 (hex) of the raw token. **Raw never stored.** |
| `status`        | text          | `'valid'` \| `'revoked'`, default `'valid'`, CHECK |
| `issued_at`     | timestamptz   | set when the token is minted                       |
| `checked_in_at` | timestamptz   | one-time check-in (scanner, later)                 |
| `checked_in_by` | uuid          | host who scanned (later); FK to `auth.users`       |

RLS on `attendees` is unchanged (host-only read). The public ticket view is served
via a **narrow service-role read scoped by `token_hash`** — no new anon RLS policy;
the token is the capability.

## Issuance + delivery (the payment-extensible core)

`issueTicketsForOrder(orderId)` — runs after `confirm_order` reports `confirmed`:

1. Read the confirmed order + its tokenless `attendees` rows + event fields.
2. For each tokenless row: mint token = `base64url(crypto.randomBytes(32))` (256-bit),
   store `token_hash = sha256(token)`, set `issued_at`. Keep raw token in memory only.
3. Send **one** email to `buyer_email` with all N tickets (each its own QR + link).
4. Idempotent: skips rows that already have a token; safe under webhook retry / double submit.

Wiring:
- Free: `rsvpToEvent` calls it inline after `confirm_order`.
- Paid (future): the Stripe webhook calls the same function after `confirm_order`.

## QR + security

- QR encodes the absolute ticket URL `${NEXT_PUBLIC_SITE_URL}/t/<token>`.
- Token: 256-bit, opaque, unguessable. **Hashed at rest** so a DB read leak cannot
  forge tickets. No PII in the QR.
- Lookup: hash the incoming token, match `token_hash`. Light rate-limit on the route.
- Check-in (later): host-authenticated, **idempotent, one-time** — the real
  anti-screenshot control (second scan → "already checked in at <t>").
- Revocation: `status='revoked'` (e.g. cancelled/refunded order) → page + scan read void.
- Deliberately out of scope (future, paid/high-demand only): AES-encrypted payloads,
  rotating/animated QR, per-scan re-issuance.

## Pages / routes

- `GET /t/[token]` — public ticket page (`force-dynamic`): event name/date/location,
  guest name, large QR, status pill (Valid / Checked in / Void), add-to-calendar.
- `GET /t/[token]/qr.png` — streams the QR PNG (email `<img src>` + page). Cacheable
  briefly, no-store if revoked.
- `EventActionBar` success state → "You're in — check your email" + link to ticket(s).

## Files

New: `supabase/migrations/*_attendee_tickets.sql`, `src/lib/tickets.ts`,
`src/lib/qr.ts`, `src/lib/email/resend.ts`, `src/emails/TicketEmail.tsx`,
`src/app/t/[token]/page.tsx`, `src/app/t/[token]/qr.png/route.ts`.
Edit: `src/app/e/[id]/actions.ts`, `src/components/EventActionBar.tsx`.

Deps: `qrcode` (+`@types/qrcode`), `resend`, `@react-email/components`.
Env: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.

## Testing

- DB test (`supabase/tests`): issuance idempotent; revoked ticket reads void.
- Unit: token hash round-trip; lookup rejects garbage/tampered token.
- Manual E2E: RSVP → ticket page + scannable QR → dev email preview shows N QRs.

## Deferred (seams left in place)

Host camera scanner + check-in action; per-guest names at RSVP; Stripe checkout.
