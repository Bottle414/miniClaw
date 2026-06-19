## MODIFIED Requirements

### Requirement: SSE chat endpoint
Server SHALL expose `POST /api/chat` endpoint that accepts `{ message: string, sessionId?: string }` body, gets or creates a runtime for the session via `chatService.chat()`, and returns SSE stream. The route path SHALL reference `ROUTES.CHAT` constant.

#### Scenario: User sends a chat message
- **WHEN** client sends `POST /api/chat` with body `{ "message": "Hello", "sessionId": "abc" }`
- **THEN** server responds with `Content-Type: text/event-stream` and begins streaming `RuntimeEvent` as SSE events

#### Scenario: Missing message field
- **WHEN** client sends `POST /api/chat` with empty or missing `message` field
- **THEN** server responds with `400` status and error message

### Requirement: Runtime event to SSE mapping
Server SHALL consume `AsyncIterable<RuntimeEvent>` from `chatService.chat()` and forward each event as an SSE `data` line with `event: runtime-event`. The `serializeEvent` utility SHALL be imported from `service/utils.js`.

#### Scenario: Text delta streaming
- **WHEN** runtime yields `{ type: "text-delta", delta: "Hi" }`
- **THEN** server sends SSE: `event: runtime-event\ndata: {"type":"text-delta","delta":"Hi"}\n\n`

#### Scenario: Loop complete event
- **WHEN** runtime yields `{ type: "loop-complete", state: ..., response: "done" }`
- **THEN** server sends SSE with the serialized event and then closes the stream

### Requirement: Error event serialization
Server SHALL convert `Error` objects in `ErrorEvent` to plain JSON `{ message, stack }` before SSE transmission, using `serializeEvent` from `service/utils.js`.

#### Scenario: Runtime error event
- **WHEN** runtime yields `{ type: "error", error: Error("boom") }`
- **THEN** server sends SSE: `data: {"type":"error","error":{"message":"boom","stack":"..."}}`

### Requirement: Runtime initialization
Server SHALL create runtime instances per session via `chatService` on demand, using environment variables (`API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `SESSIONS_ROOT`). The per-session runtime cache SHALL be managed within `chatService`.

#### Scenario: Server starts with valid config
- **WHEN** server starts with `API_KEY` set in environment
- **THEN** runtime is created on first chat request and cached per session

#### Scenario: Missing API key
- **WHEN** server starts without `API_KEY` environment variable
- **THEN** server logs error and exits with non-zero code

### Requirement: Static health endpoint
Server SHALL expose `GET /api/health` returning `{ status: "ok" }`. The route path SHALL reference `ROUTES.HEALTH` constant.

#### Scenario: Health check
- **WHEN** client sends `GET /api/health`
- **THEN** server responds with `200` and `{ "status": "ok" }`

### Requirement: Session detail API
Server SHALL provide a REST API endpoint to retrieve session details including session ID, created timestamp, updated timestamp, and message count. The route path SHALL reference `ROUTES.SESSIONS.DETAIL` constant. Business logic SHALL be in `sessionService.detail()`.

#### Scenario: Get session details
- **WHEN** client sends GET /api/session/:id
- **THEN** server returns JSON with id, createdAt, updatedAt, and messageCount

#### Scenario: Session not found
- **WHEN** client sends GET /api/session/:id with a non-existent session ID
- **THEN** server returns 404 with error message

### Requirement: Session memory API
Server SHALL provide a REST API endpoint to retrieve memory state for a session including summaries, facts, context messages count, and canonical messages count. The route path SHALL reference `ROUTES.SESSIONS.DETAIL` constant. Business logic SHALL be in `sessionService.detail()`.

#### Scenario: Get session memory
- **WHEN** client sends GET /api/session/:id/memory
- **THEN** server returns JSON with summaries, facts, contextMessagesCount, and canonicalMessagesCount

#### Scenario: Session memory not found
- **WHEN** client sends GET /api/session/:id/memory with a non-existent session ID
- **THEN** server returns 404 with error message
