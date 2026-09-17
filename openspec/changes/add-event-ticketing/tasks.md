<!-- Status note (2026-09-17): DB core (groups 2, 3, 5) applied to Supabase project
     vospmxzdcvbzucemxnnz and verified live via MCP: oversell guard + CHECK backstop,
     idempotent confirm, expiry sweep, late-payment needs_refund, and the anon RLS
     boundary all pass. Migrations live in supabase/migrations/ (versions match remote).
     MVP simplification: one order == one reservation == one ticket type + qty
     (no order_items table yet). -->

## 1. Supabase wiring

- [x] 1.1 Add Supabase deps (`@supabase/supabase-js`, `@supabase/ssr`) — plus `pg` (dev) for DB tests
- [ ] 1.2 Supabase clients: browser (`client.ts`) + SSR server (`server.ts`) **done**; service-role server-only client still TODO (group 6)
- [ ] 1.3 Env: `.env.local` has URL + publishable key **done**; service-role key + payment keys still TODO
- [x] 1.4 Set up Supabase migrations directory and workflow (`supabase init`; migrations applied + version-synced with remote)

## 2. Schema & migrations

- [x] 2.1 `events` table (id, host_id, title, description, status draft|published|cancelled, timestamps)
- [x] 2.2 `ticket_types` table (id, event_id, name, price_cents, capacity, sold, held) with CHECK `sold >= 0 AND held >= 0 AND sold + held <= capacity` — verified live
- [x] 2.3 `reservations` table (id, ticket_type_id, qty, status held|expired|consumed|cancelled, expires_at, timestamps)
- [x] 2.4 `orders` table (id, event_id, reservation_id, ticket_type_id, qty, buyer_email, status, needs_refund, provider_ref). MVP: line items folded onto the order; `order_items` deferred
- [x] 2.5 `attendees` table (id, event_id, order_id, ticket_type_id, email, name) — one row per confirmed seat
- [x] 2.6 `processed_webhook_events` table with provider_event_id PRIMARY KEY
- [x] 2.7 Indexes: reservations sweep (partial on expires_at), orders(provider_ref unique + event_id), all FK columns

## 3. Inventory functions (oversell safety)

- [x] 3.1 `reserve_seat(...)` SECURITY DEFINER, search_path='' : single guarded `UPDATE ... WHERE capacity - sold - held >= qty`; inserts `held` reservation; raises `insufficient_inventory` — verified live
- [x] 3.2 `confirm_order(...)` : exactly-once (processed-events ledger), moves held→sold under the CHECK, one attendee/seat, `needs_refund` on late-payment-after-resale — verified live (idempotent + refund flag)
- [ ] 3.3 `release_expired_reservations()` sweep — **function applied + verified**; still TODO: **schedule** it (pg_cron or a Vercel Cron route)
- [ ] 3.4 Concurrency test — Node harness written (`supabase/tests/reserve_seat.test.mjs`); guard + CHECK backstop verified live sequentially; true N-parallel run still pending a DB connection string

## 4. Host auth (Azure / Microsoft Entra OAuth)

- [x] 4.1 Register single-tenant Entra app + enable Supabase `azure` provider (client id/secret + Azure Tenant URL); redirect URI `https://vospmxzdcvbzucemxnnz.supabase.co/auth/v1/callback` — verified: authorize endpoint redirects to the correct tenant/client, Microsoft sign-in page loads with no AADSTS error
- [x] 4.2 Sign-in page (`/login`): "Sign in with Microsoft" → `signInWithOAuth({ provider: 'azure', scopes: 'email' })`
- [x] 4.3 Auth callback route (`/auth/callback`): `exchangeCodeForSession` → `/dashboard`
- [x] 4.4 Guard via Next 16 `proxy.ts` (session refresh + redirect unauthenticated off `/dashboard`); typecheck + lint clean [pending: real login round-trip test]

## 5. RLS policies + tests

- [x] 5.1 Enable + FORCE RLS on all tables; default deny
- [x] 5.2 `events`: host CRUD where `host_id = (select auth.uid())`; anon SELECT where `status='published'`
- [x] 5.3 `ticket_types`: anon SELECT for published events; host manage own
- [x] 5.4 `orders`/`attendees`: host SELECT scoped to owned events; no anon/authenticated access to reservations/processed_webhook_events
- [x] 5.5 RLS enforcement verified live: anon cannot read attendees/orders/reservations, cannot see drafts, can read published (host-vs-host uses the same `host_id` predicate)

## 6. Guest purchase server routes

- [ ] 6.1 Reserve route (server, service-role): validate published event + availability, call `reserve_seat`, return reservation
- [ ] 6.2 Checkout route: reject expired/consumed reservation; create `pending` order linked to reservation; create provider checkout session; commit order before redirect; return redirect URL
- [ ] 6.3 Webhook route: verify signature (4xx on fail); call `confirm_order` (idempotent); 5xx if order not yet found (let provider retry)
- [ ] 6.4 Expiry: ensure hold `expires_at` covers the Stripe Checkout session lifetime (avoid late-payment oversell)

## 7. Payment provider adapter (Stripe, hosted Checkout)

- [ ] 7.1 Define thin interface: `createCheckoutSession(order)`, `verifyAndParseWebhook(req) -> {providerEventId, orderRef, status}`
- [ ] 7.2 Implement Stripe behind the interface; provision via Vercel Marketplace `payments` (needs `vercel link` + browser connect), pull keys with `vercel env pull`

## 8. UI

- [x] 8.0 Public events home (`/`): live list, **"Playbill + stained glass" design (Option D)** — Fraunces masthead, gold rule, mesh featured cover, mesh date-chip rows, categories, past section; verified via Playwright
- [x] 8.1 Public event page (`/e/[id]`): stained-glass mesh hero + all states (open / almost-full / sold-out / ended / 404); mobile sticky action bar. **Purchase action stubbed** pending groups 6–7
  - Design system: added Fraunces display font; `category` column (migration); deterministic `meshFor(id)` stained-glass covers from rose-window hues
- [ ] 8.2 Post-payment confirmation/return page reflecting order status
- [ ] 8.3 Host dashboard: create/edit/publish events and ticket types
- [ ] 8.4 Host "who's going" view: confirmed attendees for owned events only

## 9. Verification

- [ ] 9.1 E2E happy path: reserve → pay → webhook confirm → seat committed → attendee appears in directory
- [x] 9.2 DB edge cases (oversell guard, CHECK backstop, duplicate-webhook, expired-hold, late-payment refund) — verified live via MCP
- [ ] 9.3 `openspec validate add-event-ticketing` clean; lint/typecheck green
