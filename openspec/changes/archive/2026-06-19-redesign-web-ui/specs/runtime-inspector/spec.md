## ADDED Requirements

### Requirement: Runtime Inspector panel
Runtime Inspector SHALL display as a collapsible right-side panel with approximately 320px width. It SHALL be expanded by default and support toggle to collapse/close.

#### Scenario: Inspector expanded
- **WHEN** inspector is in expanded state
- **THEN** inspector panel displays with approximately 320px width, showing tabbed content

#### Scenario: Inspector collapsed
- **WHEN** inspector is collapsed
- **THEN** inspector panel is hidden, chat area expands to fill the space

#### Scenario: Inspector default state
- **WHEN** web UI first loads
- **THEN** inspector is expanded by default

### Requirement: Inspector tabs
Runtime Inspector SHALL use a tab component with four tabs: Events, Tools, Memory, Session.

#### Scenario: Tab switching
- **WHEN** user clicks a tab
- **THEN** the corresponding tab content is displayed

### Requirement: Events tab
Events tab SHALL display a timeline of ReAct iteration events, showing iteration numbers and phase changes (thinking, acting, observing, deciding). It SHALL handle event types: iteration-start, phase-change, loop-end.

#### Scenario: Iteration start
- **WHEN** an iteration-start event is received
- **THEN** a new iteration header (e.g., "Iteration 1") is displayed in the timeline

#### Scenario: Phase change
- **WHEN** a phase-change event is received
- **THEN** the corresponding phase label (thinking/acting/observing/deciding) is displayed under the current iteration

#### Scenario: Loop end
- **WHEN** a loop-end event is received
- **THEN** the timeline indicates the loop has ended with the termination reason

### Requirement: Tools tab
Tools tab SHALL display tool execution records showing tool name, parameters, and results. Each record SHALL support expand/collapse toggle.

#### Scenario: Tool execution display
- **WHEN** a tool-execute event is received
- **THEN** a tool record appears showing the tool name

#### Scenario: Tool result display
- **WHEN** a tool-result event is received
- **THEN** the corresponding tool record updates to show the result

#### Scenario: Tool record expand/collapse
- **WHEN** user clicks a tool record
- **THEN** the record expands to show parameters and result details, or collapses to show only the tool name

### Requirement: Memory tab
Memory tab SHALL display Memory system state including: Summary, Facts, Context Messages count, and Canonical Messages count.

#### Scenario: Memory state display
- **WHEN** memory tab is active and data is available
- **THEN** Summary section, Facts section, Context Messages count, and Canonical Messages count are displayed

#### Scenario: Memory data loading
- **WHEN** memory tab is active and no data is loaded
- **THEN** a loading or empty state is displayed

### Requirement: Session tab
Session tab SHALL display session metadata: Session ID, Created At, Updated At, Message Count.

#### Scenario: Session metadata display
- **WHEN** session tab is active and a session is selected
- **THEN** Session ID, Created At, Updated At, and Message Count are displayed

#### Scenario: No active session
- **WHEN** session tab is active but no session is selected
- **THEN** an empty state or prompt to select a session is displayed
