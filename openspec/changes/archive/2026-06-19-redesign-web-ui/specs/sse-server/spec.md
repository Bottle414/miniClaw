## ADDED Requirements

### Requirement: Session detail API
Server SHALL provide a REST API endpoint to retrieve session details including session ID, created timestamp, updated timestamp, and message count.

#### Scenario: Get session details
- **WHEN** client sends GET /api/session/:id
- **THEN** server returns JSON with id, createdAt, updatedAt, and messageCount

#### Scenario: Session not found
- **WHEN** client sends GET /api/session/:id with a non-existent session ID
- **THEN** server returns 404 with error message

### Requirement: Session memory API
Server SHALL provide a REST API endpoint to retrieve memory state for a session including summaries, facts, context messages count, and canonical messages count.

#### Scenario: Get session memory
- **WHEN** client sends GET /api/session/:id/memory
- **THEN** server returns JSON with summaries, facts, contextMessagesCount, and canonicalMessagesCount

#### Scenario: Session memory not found
- **WHEN** client sends GET /api/session/:id/memory with a non-existent session ID
- **THEN** server returns 404 with error message
