## ADDED Requirements

### Requirement: UI state store
The system SHALL use Zustand to manage UI state including sidebar expanded/collapsed state and inspector expanded/collapsed state.

#### Scenario: Sidebar toggle state
- **WHEN** user toggles the sidebar
- **THEN** sidebar expanded/collapsed state is updated in the store and the UI reflects the change

#### Scenario: Inspector toggle state
- **WHEN** user toggles the inspector
- **THEN** inspector expanded/collapsed state is updated in the store and the UI reflects the change

### Requirement: Chat state store
The system SHALL use Zustand to manage chat state including session list, active session ID, messages per session, and streaming status.

#### Scenario: Session creation
- **WHEN** a new session is created
- **THEN** the session is added to the session list in the store

#### Scenario: Session selection
- **WHEN** a session is selected
- **THEN** the active session ID is updated in the store and messages for that session are displayed

#### Scenario: Message sending
- **WHEN** a message is sent
- **THEN** the message is added to the current session's messages in the store

#### Scenario: Streaming state
- **WHEN** streaming starts or stops
- **THEN** the isStreaming flag in the store is updated accordingly

### Requirement: Runtime event store
The system SHALL use Zustand to manage runtime event data including iteration timeline, phase changes, tool execution records, and runtime events.

#### Scenario: Runtime event processing
- **WHEN** a runtime event (iteration-start, phase-change, tool-execute, tool-result, loop-end) is received from SSE
- **THEN** the event data is stored and organized in the runtime store for Inspector display

#### Scenario: Tool record tracking
- **WHEN** tool-execute and tool-result events are received
- **THEN** tool execution records are created/updated in the store with tool name, parameters, and results

#### Scenario: Runtime state reset on new chat
- **WHEN** a new chat session is started
- **THEN** runtime event data is cleared in the store
