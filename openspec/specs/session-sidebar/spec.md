# Session Sidebar 规格

## Purpose

定义 Session Sidebar 的交互与展示规范，包括侧边栏布局、图标列、会话列表及搜索占位功能。

## Requirements

### Requirement: Session Sidebar layout
Session Sidebar SHALL support expand/collapse toggle. Expanded width SHALL be approximately 260px, collapsed width SHALL be approximately 60px.

#### Scenario: Sidebar expanded
- **WHEN** sidebar is in expanded state
- **THEN** sidebar displays icon column with labels and session list below it, width is approximately 260px

#### Scenario: Sidebar collapsed
- **WHEN** sidebar is in collapsed state
- **THEN** sidebar displays only a vertical column of icons without labels, width is approximately 60px

### Requirement: Sidebar icon column
Sidebar SHALL display a vertical icon column containing: miniClaw Logo, New Chat button (PlusOutlined icon), Session search input (placeholder, no functionality), and Collapse/Expand toggle button (MenuFoldOutlined / MenuUnfoldOutlined icons). Logo, New Chat, and search input SHALL be sticky and remain visible during scroll.

#### Scenario: Icon column in expanded mode
- **WHEN** sidebar is expanded
- **THEN** each icon displays as `<icon> <label>` format (e.g., PlusOutlined + "New Chat")

#### Scenario: Icon column in collapsed mode
- **WHEN** sidebar is collapsed
- **THEN** each icon displays as icon only, no text label

#### Scenario: Collapse/Expand toggle
- **WHEN** user hovers over the toggle button
- **THEN** tooltip displays "折叠边栏" when expanded, "展开边栏" when collapsed

#### Scenario: New Chat click
- **WHEN** user clicks the New Chat icon
- **THEN** a new session is created and becomes the active session

#### Scenario: Sticky icons during scroll
- **WHEN** session list is scrolled
- **THEN** Logo, New Chat, and search input remain visible at the top

### Requirement: Session list
Sidebar SHALL display a scrollable list of sessions when expanded. Each session item SHALL display: title, last updated time. On hover, a red delete icon (DeleteOutlined) SHALL appear on the right side.

#### Scenario: Session item display
- **WHEN** sidebar is expanded and sessions exist
- **THEN** each session item shows its title and last updated time

#### Scenario: Session item hover
- **WHEN** user hovers over a session item
- **THEN** a red DeleteOutlined icon appears on the right side of the item

#### Scenario: Session item click
- **WHEN** user clicks a session item
- **THEN** that session becomes the active session and its messages are displayed

#### Scenario: Session delete
- **WHEN** user clicks the delete icon on a session item
- **THEN** that session is deleted and removed from the list

#### Scenario: Active session highlight
- **WHEN** a session is the currently active session
- **THEN** that session item is visually highlighted

### Requirement: Session search placeholder
Sidebar SHALL display a search input field when expanded. The search functionality SHALL NOT be implemented in this iteration.

#### Scenario: Search input display
- **WHEN** sidebar is expanded
- **THEN** a search input is visible in the icon column area

#### Scenario: Search input interaction
- **WHEN** user types in the search input
- **THEN** no filtering occurs (placeholder functionality only)
