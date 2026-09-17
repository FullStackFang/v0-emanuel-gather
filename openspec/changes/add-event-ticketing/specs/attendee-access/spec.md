## ADDED Requirements

### Requirement: Attendee and order data is protected by database RLS
Reservations, orders, order items, and attendee records SHALL be protected by Row-Level Security such that the database is the primary authorization boundary. There SHALL be no policy granting anonymous or ordinary authenticated clients direct read or write access to these tables. A bug in application code SHALL NOT be sufficient to expose this data.

#### Scenario: Anonymous client cannot read attendee data directly
- **WHEN** an anonymous database client queries the attendees or orders tables directly
- **THEN** no rows are returned

#### Scenario: A host cannot read another host's attendees
- **WHEN** an authenticated host queries attendees for an event they do not own
- **THEN** no rows are returned

### Requirement: Guest purchase paths run through trusted server code
Because attendees purchase without an account, seat reservation, checkout creation, and payment confirmation SHALL be performed by server-side code using a privileged (service-role) database path or security-definer functions, not by a browser client relying on RLS. The privileged path SHALL be confined to server-only code and never exposed to the browser.

#### Scenario: Reservation is performed server-side for a guest
- **WHEN** a guest (unauthenticated) buyer reserves a seat
- **THEN** the reservation is created by server-side code with the privileged path
- **AND** no service-role credential is sent to the browser

### Requirement: The "who's going" directory is host-only and scoped to owned events
A host SHALL be able to view the list of confirmed attendees for events they own. The directory SHALL show only attendees of `confirmed` orders. A host SHALL NOT be able to view attendees of events owned by another host. Attendees SHALL NOT have access to any attendee directory in this change.

#### Scenario: Host views confirmed attendees for their event
- **WHEN** a host opens the "who's going" view for an event they own
- **THEN** they see the attendees whose orders are `confirmed`
- **AND** they do not see attendees from unconfirmed (pending/expired) orders

#### Scenario: Host cannot view another host's attendee directory
- **WHEN** a host attempts to open the attendee directory for an event they do not own
- **THEN** access is denied and no attendee data is returned
