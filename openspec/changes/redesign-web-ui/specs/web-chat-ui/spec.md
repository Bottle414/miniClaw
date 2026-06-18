## MODIFIED Requirements

### Requirement: AI Chat layout
Web UI SHALL use a three-column layout: Session Sidebar on the left, Chat Area in the center, and Runtime Inspector on the right. Chat messages SHALL be centered with a maximum width of approximately 800px. Assistant and User messages SHALL use different background colors. The input area SHALL be fixed at the bottom of the Chat Area.

#### Scenario: Layout structure
- **WHEN** Web UI loads
- **THEN** layout shows Session Sidebar on the left, Chat Area in the center, and Runtime Inspector on the right

#### Scenario: Message centering
- **WHEN** messages are displayed in the Chat Area
- **THEN** messages are centered with a maximum width of approximately 800px

#### Scenario: Message background differentiation
- **WHEN** assistant and user messages are displayed
- **THEN** assistant messages use one background color and user messages use a different background color

#### Scenario: Input area fixed position
- **WHEN** chat messages are scrolled
- **THEN** the input area remains fixed at the bottom of the Chat Area

### Requirement: Chat message list
Web UI SHALL display a scrollable list of chat messages, alternating between user and assistant roles, using Ant Design components for styling.

#### Scenario: User sends a message
- **WHEN** user types a message and submits
- **THEN** a new user message bubble appears in the message list

#### Scenario: Assistant streaming response
- **WHEN** assistant begins streaming a response
- **THEN** a new assistant message bubble appears and updates in real-time as text-delta events arrive

### Requirement: Message input area
Web UI SHALL provide a text input area at the bottom of the Chat Area with a send button, using Ant Design Input component. Enter key submits the message.

#### Scenario: Submit message via Enter key
- **WHEN** user types text and presses Enter
- **THEN** message is sent and input is cleared

#### Scenario: Submit message via send button
- **WHEN** user clicks the send button
- **THEN** message is sent and input is cleared

#### Scenario: Empty message prevention
- **WHEN** user submits with empty input
- **THEN** no message is sent

### Requirement: Streaming state indicator
Web UI SHALL show a typing/streaming indicator while the assistant is generating a response.

#### Scenario: Streaming in progress
- **WHEN** SSE events are being received
- **THEN** a streaming indicator is shown on the current assistant message

#### Scenario: Streaming complete
- **WHEN** loop-complete event is received
- **THEN** streaming indicator is removed

### Requirement: Auto-scroll
Web UI SHALL auto-scroll to the latest message as new content arrives.

#### Scenario: New content during streaming
- **WHEN** assistant message content updates
- **THEN** chat view scrolls to show the latest content

### Requirement: Visual style
Web UI SHALL use Ant Design component library for consistent styling. The visual style SHALL follow Claude Web aesthetics: light background, soft gray borders, generous whitespace, rounded corners, and clean typography. Ant Design ConfigProvider SHALL be used to customize the theme.

#### Scenario: Ant Design theme
- **WHEN** Web UI loads
- **THEN** Ant Design components render with a Claude-inspired light theme (soft grays, rounded corners, generous spacing)

#### Scenario: Style consistency
- **WHEN** any component is rendered
- **THEN** it uses Ant Design components or CSS Modules following project conventions (component-folder with index.tsx + index.module.css)
