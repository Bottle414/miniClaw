# Message Merge 规格

## Purpose

定义 Web UI 中聊天消息的数据模型、流式文本块合并机制、消息完成检测、段落类型系统及段落拆分与渲染规则。

## Requirements

### Requirement: Message model
Web UI SHALL define a `ChatMessage` type with `id`, `role` (`"user"` | `"assistant"`), `content` (string), `segments` (Segment[]), and `isComplete` (boolean) fields.

#### Scenario: User message creation
- **WHEN** user submits a message
- **THEN** a `ChatMessage` is created with `role: "user"`, `content` set to input text, `isComplete: true`, and `segments` derived from content

#### Scenario: Assistant message creation
- **WHEN** first `text-delta` event arrives for a new response
- **THEN** a `ChatMessage` is created with `role: "assistant"`, `content` set to delta, `isComplete: false`

### Requirement: Chunk merge into message
Web UI SHALL merge `text-delta` chunks into the current assistant message's `content` by string concatenation.

#### Scenario: Sequential text-delta events
- **WHEN** events `{ delta: "Hel" }` then `{ delta: "lo" }` arrive
- **THEN** current assistant message `content` becomes `"Hello"`

### Requirement: Message completion detection
Web UI SHALL mark the current assistant message as complete when `loop-complete` event is received. Subsequent `text-delta` events create a new message.

#### Scenario: Loop complete ends message
- **WHEN** `loop-complete` event is received after streaming
- **THEN** current assistant message `isComplete` is set to `true`

#### Scenario: New message after completion
- **WHEN** `text-delta` arrives after `loop-complete`
- **THEN** a new assistant message is created instead of appending to the previous one

### Requirement: Segment type system
Web UI SHALL define a `Segment` discriminated union type with at minimum `TextSegment: { type: "text", content: string }`. The type system SHALL be extensible for future segment types (image, card, etc.).

#### Scenario: Text segment
- **WHEN** message content is plain text
- **THEN** segments contain one or more `TextSegment` objects

### Requirement: Segment splitting via regex
Web UI SHALL split message content into segments using a regex-based splitter function after each content merge.

#### Scenario: Plain text splitting
- **WHEN** message content is `"Hello world"`
- **THEN** segments is `[{ type: "text", content: "Hello world" }]`

#### Scenario: Content update triggers re-split
- **WHEN** content changes from `"Hel"` to `"Hello"`
- **THEN** segments is recalculated to `[{ type: "text", content: "Hello" }]`

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

### Requirement: Segment rendering
Web UI SHALL render each segment based on its `type` field. `TextSegment` renders as plain text. Unknown segment types render as fallback text.

#### Scenario: Text segment rendering
- **WHEN** segment is `{ type: "text", content: "Hi" }`
- **THEN** rendered as plain text "Hi"

#### Scenario: Unknown segment type fallback
- **WHEN** segment has an unrecognized `type`
- **THEN** rendered as `[unsupported segment: <type>]`
