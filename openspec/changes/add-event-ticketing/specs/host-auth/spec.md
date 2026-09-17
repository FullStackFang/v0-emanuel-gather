## ADDED Requirements

### Requirement: Hosts sign in with their Microsoft (Azure Entra ID) account
A host SHALL authenticate via Azure / Microsoft Entra ID OAuth; no password SHALL be stored by the application. Completing the Microsoft consent flow SHALL establish an authenticated cookie session tied to the host's identity. The system SHALL require that Azure returns a verified email for the account. Only accounts permitted by the configured tenant scope SHALL be able to sign in; accounts outside that scope SHALL be refused.

#### Scenario: Successful Microsoft sign in
- **WHEN** a host chooses "Sign in with Microsoft" and completes the Microsoft consent flow with an in-scope account
- **THEN** an authenticated session is established for that host

#### Scenario: Out-of-scope account is refused
- **WHEN** a person authenticates with a Microsoft account outside the configured tenant scope
- **THEN** no host session is established for the application

### Requirement: Event management requires an authenticated host session
Creating, editing, publishing, or deleting an event and its ticket types SHALL require an authenticated host session. Unauthenticated requests to manage events SHALL be denied.

#### Scenario: Unauthenticated event management is denied
- **WHEN** a request without a valid session attempts to create or edit an event
- **THEN** the request is denied
- **AND** no event data is changed

#### Scenario: Authenticated host reaches their dashboard
- **WHEN** a host with a valid session opens the host dashboard
- **THEN** they can create and manage events

### Requirement: A host may manage only their own events
A host SHALL be able to read and modify only events they own (`host_id` equal to their authenticated identity). Attempts to read or modify another host's event SHALL be denied by the database authorization layer, not solely by application checks.

#### Scenario: Host cannot edit another host's event
- **WHEN** an authenticated host attempts to edit an event owned by a different host
- **THEN** the modification is denied at the database layer
- **AND** the other host's event is unchanged

#### Scenario: Host edits their own event
- **WHEN** an authenticated host edits an event they own
- **THEN** the change is applied
