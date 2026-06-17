# Web Chat UI 规格

## Purpose

定义 Web 聊天界面的交互与布局规范，包括消息列表展示、输入区域、SSE 客户端连接、流式状态指示及自动滚动行为。

## Requirements

### Requirement: Chat message list
Web UI SHALL display a scrollable list of chat messages, alternating between user and assistant roles.

#### Scenario: User sends a message
- **WHEN** user types a message and submits
- **THEN** a new user message bubble appears in the message list

#### Scenario: Assistant streaming response
- **WHEN** assistant begins streaming a response
- **THEN** a new assistant message bubble appears and updates in real-time as text-delta events arrive

### Requirement: Message input area
Web UI SHALL provide a text input area at the bottom of the screen with a send button. Enter key submits the message.

#### Scenario: Submit message via Enter key
- **WHEN** user types text and presses Enter
- **THEN** message is sent and input is cleared

#### Scenario: Submit message via send button
- **WHEN** user clicks the send button
- **THEN** message is sent and input is cleared

#### Scenario: Empty message prevention
- **WHEN** user submits with empty input
- **THEN** no message is sent

### Requirement: SSE client connection
Web UI SHALL connect to the SSE server endpoint and consume runtime events.

#### Scenario: Successful SSE connection
- **WHEN** user submits a message
- **THEN** Web UI opens SSE connection to `POST /api/chat` and begins receiving events

#### Scenario: SSE connection error
- **WHEN** SSE connection fails
- **THEN** Web UI displays an error message in the chat

### Requirement: Streaming state indicator
Web UI SHALL show a typing/streaming indicator while the assistant is generating a response.

#### Scenario: Streaming in progress
- **WHEN** SSE events are being received
- **THEN** a streaming indicator (e.g., cursor blink) is shown on the current assistant message

#### Scenario: Streaming complete
- **WHEN** `loop-complete` event is received
- **THEN** streaming indicator is removed

### Requirement: Auto-scroll
Web UI SHALL auto-scroll to the latest message as new content arrives.

#### Scenario: New content during streaming
- **WHEN** assistant message content updates
- **THEN** chat view scrolls to show the latest content

### Requirement: AI Chat layout
Web UI SHALL use a layout similar to common AI Chat interfaces: centered content area, message bubbles, bottom input bar.

#### Scenario: Layout structure
- **WHEN** Web UI loads
- **THEN** layout shows a header area, centered message list, and bottom input bar
