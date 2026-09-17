## ADDED Requirements

### Requirement: Events have ticket types with finite capacity
An event SHALL have one or more ticket types, and each ticket type SHALL have a non-negative integer `capacity` fixed at creation time. The system SHALL track, per ticket type, the number of `sold` (confirmed) and `held` (actively reserved) seats. The database SHALL enforce the invariant `sold >= 0 AND held >= 0 AND sold + held <= capacity` as a constraint, independent of application code.

#### Scenario: Ticket type created with capacity
- **WHEN** a host creates a ticket type with capacity 50 for their event
- **THEN** the ticket type is stored with `capacity = 50`, `sold = 0`, `held = 0`
- **AND** available seats (`capacity - sold - held`) reported for it is 50

#### Scenario: Invariant rejects any state that would exceed capacity
- **WHEN** any operation attempts to set a ticket type such that `sold + held > capacity`
- **THEN** the database rejects the write and the enclosing transaction fails
- **AND** no partial change is persisted

### Requirement: Public availability is visible for published events
For an event whose `status` is `published`, anyone (no authentication) SHALL be able to read the event's public details and the available seat count per ticket type. Availability SHALL reflect `capacity - sold - held`. Draft or unpublished events SHALL NOT be readable by the public.

#### Scenario: Anonymous visitor views a published event
- **WHEN** an unauthenticated visitor requests a published event
- **THEN** they receive the event details and, for each ticket type, the current available seat count

#### Scenario: Anonymous visitor cannot view a draft event
- **WHEN** an unauthenticated visitor requests an event whose status is not `published`
- **THEN** the event is not returned

### Requirement: Reserving a seat is atomic and oversell-safe
The system SHALL reserve seats via a single atomic database operation that decrements available inventory under a row lock. When two or more requests concurrently attempt to reserve the last available seat(s) of a ticket type, at most the available quantity SHALL succeed; the rest SHALL fail with an out-of-inventory result. A successful reservation SHALL create a reservation record in `held` state with an `expires_at` timestamp and increment the ticket type's `held` count by the reserved quantity.

#### Scenario: Reservation succeeds when inventory is available
- **WHEN** a buyer reserves 2 seats of a ticket type with 5 available
- **THEN** a `held` reservation for 2 is created with an `expires_at` in the future
- **AND** the ticket type's available count drops to 3

#### Scenario: Concurrent buyers cannot oversell the last seat
- **WHEN** 1 seat is available and two buyers submit reservations for 1 seat at the same time
- **THEN** exactly one reservation succeeds and the other fails with out-of-inventory
- **AND** the ticket type's `held + sold` never exceeds `capacity`

#### Scenario: Reservation for more than available fails
- **WHEN** a buyer requests 4 seats but only 3 are available
- **THEN** the reservation fails with out-of-inventory
- **AND** no seats are held and available count is unchanged

### Requirement: Expired reservations return their seats to inventory
A `held` reservation that is not confirmed by its `expires_at` SHALL be released, returning its seats to available inventory. Release SHALL decrement the ticket type's `held` count by the reservation's quantity and mark the reservation `expired`. Release SHALL occur via an authoritative scheduled sweep so that inventory is recovered even with no buyer activity, and expired holds SHALL NOT block new reservations.

#### Scenario: Sweep releases an expired hold
- **WHEN** a `held` reservation's `expires_at` has passed and the sweep runs
- **THEN** the reservation is marked `expired`
- **AND** its seats are added back to available inventory

#### Scenario: Expired hold does not block a new reservation
- **WHEN** a ticket type is fully held but one of those holds has expired
- **THEN** a new reservation for that freed seat succeeds

### Requirement: Orders follow a defined lifecycle
An order SHALL be one of `pending`, `confirmed`, `expired`, or `cancelled`. An order SHALL be created in `pending` state, linked to a `held` reservation, before payment begins. Only defined transitions SHALL occur: `pending → confirmed`, `pending → expired`, `pending → cancelled`. A `confirmed` order SHALL NOT transition to any other state by normal flow.

#### Scenario: Order starts pending and linked to a reservation
- **WHEN** a buyer begins checkout for a held reservation
- **THEN** a `pending` order is created referencing that reservation and its ticket type quantities

#### Scenario: Pending order expires with its reservation
- **WHEN** a `pending` order's reservation expires before payment confirms
- **THEN** the order transitions to `expired`
- **AND** the seats are returned to inventory
