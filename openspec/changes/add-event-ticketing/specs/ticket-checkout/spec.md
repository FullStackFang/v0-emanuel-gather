## ADDED Requirements

### Requirement: Checkout starts against a held reservation
The system SHALL begin payment only for an existing `held` reservation whose hold has not expired. Starting checkout SHALL create the `pending` order (linked to the reservation) and a payment-provider checkout session before the buyer is redirected to pay, so the order exists when the provider's webhook arrives. Checkout SHALL be rejected for an expired, released, or already-consumed reservation.

#### Scenario: Checkout begins for a valid hold
- **WHEN** a buyer starts checkout for a live `held` reservation
- **THEN** a `pending` order is created and linked to the reservation
- **AND** a provider checkout session is created and the buyer is directed to it

#### Scenario: Checkout refused for an expired hold
- **WHEN** a buyer starts checkout for a reservation whose `expires_at` has passed
- **THEN** checkout is rejected
- **AND** no order or checkout session is created

### Requirement: Payment webhook signature is verified
The webhook endpoint SHALL verify the payment provider's signature on every request before taking any action. A request with a missing or invalid signature SHALL be rejected with a 4xx response and SHALL cause no state change.

#### Scenario: Unsigned webhook rejected
- **WHEN** a request to the webhook endpoint has no valid provider signature
- **THEN** the endpoint responds with a 4xx status
- **AND** no order, reservation, or inventory state is changed

### Requirement: Payment confirmation is idempotent (exactly-once)
The webhook SHALL process each distinct provider event at most once. The provider event id SHALL be recorded as a unique key in the same transaction that applies the order's side effects. A repeated delivery of an already-processed event SHALL be acknowledged with a success response and SHALL produce no additional side effects (no double confirmation, no double seat commit).

#### Scenario: Duplicate webhook delivery is a no-op
- **WHEN** the provider delivers the same payment-succeeded event a second time
- **THEN** the endpoint responds success
- **AND** the order remains `confirmed` exactly once and `sold` is not incremented again

#### Scenario: Crash before commit is safely retried
- **WHEN** the handler crashes after recording nothing durably and the provider retries the event
- **THEN** the retry processes the event to completion exactly once
- **AND** the final state has the order `confirmed` and seats committed once

### Requirement: Confirmation commits held seats to sold
On a valid, not-yet-processed payment-succeeded event for a `pending` order, the system SHALL transition the order to `confirmed`, move the reserved quantity from `held` to `sold` on each ticket type, and record the confirmed attendee(s) for the event. The seat commit SHALL preserve the capacity invariant.

#### Scenario: Successful payment confirms the order
- **WHEN** a valid payment-succeeded event arrives for a `pending` order holding 2 seats
- **THEN** the order becomes `confirmed`
- **AND** the ticket type's `held` decreases by 2 and `sold` increases by 2
- **AND** 2 attendees are recorded for the event

### Requirement: A paid order whose seats cannot be committed is flagged, never oversold
If a payment-succeeded event arrives for an order but the held seats are no longer available to commit (e.g. the hold was released and resold), the system SHALL NOT exceed capacity. It SHALL mark the order `confirmed` with a `needs_refund` indicator for out-of-band resolution rather than violating the inventory invariant.

#### Scenario: Late payment after resale is flagged for refund
- **WHEN** a payment-succeeded event arrives but committing its seats would exceed `capacity`
- **THEN** the capacity invariant is preserved (no oversell)
- **AND** the order is marked `confirmed` with `needs_refund` set for follow-up
