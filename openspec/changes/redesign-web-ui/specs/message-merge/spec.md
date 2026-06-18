## MODIFIED Requirements

### Requirement: Chat message list
Web UI SHALL display a scrollable list of chat messages, alternating between user and assistant roles.

#### Scenario: User sends a message
- **WHEN** user types a message and submits
- **THEN** a new user message bubble appears in the message list

#### Scenario: Assistant streaming response
- **WHEN** assistant begins streaming a response
- **THEN** a new assistant message bubble appears and updates in real-time as text-delta events arrive

#### Scenario: Runtime event forwarding
- **WHEN** a runtime event (iteration-start, phase-change, tool-execute, tool-result, loop-end) is received from SSE
- **THEN** the event is forwarded to the runtime event store for Inspector display, in addition to existing text-delta and loop-complete handling
