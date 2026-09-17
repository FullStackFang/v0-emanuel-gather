-- Ticketing: a confirmed attendee IS a ticket. confirm_order already writes one
-- attendees row per seat; issuance (app-side, after confirmation) mints a token
-- for each and delivers it as a QR on the ticket page + email. See design
-- docs/superpowers/specs/2026-09-17-ticketing-qr-email-design.md.
--
-- Security cornerstones:
--   * token_hash stores only SHA-256(raw token). The raw token lives in the QR /
--     URL / email and is NEVER persisted, so a read of this table cannot forge a
--     valid ticket.
--   * status drives revocation (cancelled/refunded -> 'revoked').
--   * checked_in_at makes door check-in one-time (a second scan is a no-op that
--     reports the prior time) -- added now so the scanner can be built later with
--     no further schema change.
--
-- RLS is intentionally unchanged: attendees stays host-read-only. The public
-- ticket page reads via a service-role query scoped strictly by token_hash -- the
-- token is the capability, so no anon SELECT policy is introduced.

alter table public.attendees
  add column token_hash    text,
  add column status        text not null default 'valid'
                           check (status in ('valid', 'revoked')),
  add column issued_at     timestamptz,
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references auth.users (id) on delete set null;

-- One token maps to at most one attendee. Also the lookup index for /t/<token>
-- (hash the incoming token, match here). Partial: unissued rows carry NULL and
-- must not collide with each other.
create unique index attendees_token_hash_key
  on public.attendees (token_hash)
  where token_hash is not null;
