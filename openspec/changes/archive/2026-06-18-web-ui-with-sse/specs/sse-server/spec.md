## ADDED Requirements

### Requirement: SSE chat endpoint
Server SHALL expose `POST /api/chat` endpoint that accepts `{ message: string }` body, creates a runtime chat session, and returns SSE stream.

#### Scenario: User sends a chat message
- **WHEN** client sends `POST /api/chat` with body `{ "message": "Hello" }`
- **THEN** server responds with `Content-Type: text/event-stream` and begins streaming `RuntimeEvent` as SSE events

#### Scenario: Missing message field
- **WHEN** client sends `POST /api/chat` with empty or missing `message` field
- **THEN** server responds with `400` status and error message

### Requirement: Runtime event to SSE mapping
Server SHALL consume `AsyncIterable<RuntimeEvent>` from runtime and forward each event as an SSE `data` line with `event: runtime-event`.

#### Scenario: Text delta streaming
- **WHEN** runtime yields `{ type: "text-delta", delta: "Hi" }`
- **THEN** server sends SSE: `event: runtime-event\ndata: {"type":"text-delta","delta":"Hi"}\n\n`

#### Scenario: Loop complete event
- **WHEN** runtime yields `{ type: "loop-complete", state: ..., response: "done" }`
- **THEN** server sends SSE with the serialized event and then closes the stream

### Requirement: Error event serialization
Server SHALL convert `Error` objects in `ErrorEvent` to plain JSON `{ message, stack }` before SSE transmission.

#### Scenario: Runtime error event
- **WHEN** runtime yields `{ type: "error", error: Error("boom") }`
- **THEN** server sends SSE: `data: {"type":"error","error":{"message":"boom","stack":"..."}}`

### Requirement: CORS support
Server SHALL enable CORS for development, allowing requests from Vite dev server origin.

#### Scenario: Preflight request from browser
- **WHEN** browser sends `OPTIONS /api/chat` with `Origin: http://localhost:5173`
- **THEN** server responds with appropriate CORS headers allowing the origin

### Requirement: Runtime initialization
Server SHALL create a runtime instance on startup using environment variables (`API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `SESSIONS_ROOT`).

#### Scenario: Server starts with valid config
- **WHEN** server starts with `API_KEY` set in environment
- **THEN** runtime is created and ready to accept chat requests

#### Scenario: Missing API key
- **WHEN** server starts without `API_KEY` environment variable
- **THEN** server logs error and exits with non-zero code

### Requirement: Static health endpoint
Server SHALL expose `GET /api/health` returning `{ status: "ok" }`.

#### Scenario: Health check
- **WHEN** client sends `GET /api/health`
- **THEN** server responds with `200` and `{ "status": "ok" }`
