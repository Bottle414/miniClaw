## ADDED Requirements

### Requirement: 流式消息合并函数

系统 SHALL 提供 `mergeStreamMessage` 函数，将 RuntimeEvent 序列合并为完整的 `LLMAssistantMessage`。

#### Scenario: 合并文本增量
- **WHEN** 输入包含多个 `text-delta` 事件
- **THEN** 函数 SHALL 将所有 `delta` 拼接为完整的 `content` 字符串

#### Scenario: 合并工具调用
- **WHEN** 输入包含 `tool-call-start`、`tool-call-delta`、`tool-call-end` 事件序列
- **THEN** 函数 SHALL 组装完整的 `LLMToolCall[]`，每个包含 `id`、`name`、`arguments`

#### Scenario: 未完成时返回 null
- **WHEN** 输入事件序列尚未包含 `finish` 事件
- **THEN** 函数 SHALL 返回 `null`

#### Scenario: 完成时返回完整消息
- **WHEN** 输入事件序列包含 `finish` 事件
- **THEN** 函数 SHALL 返回完整的 `LLMAssistantMessage`，包含拼接的 `content` 和组装的 `toolCalls`

#### Scenario: 同时包含文本和工具调用
- **WHEN** 输入同时包含 `text-delta` 和 `tool-call-*` 事件
- **THEN** 返回的消息 SHALL 同时包含 `content` 和 `toolCalls`

#### Scenario: 忽略 tool-result 事件
- **WHEN** 输入包含 `tool-result` 事件
- **THEN** `mergeStreamMessage` SHALL 忽略该事件（tool-result 由 runtime 执行工具后产出，不属于 LLM 消息）

### Requirement: 增量合并支持

系统 SHALL 提供 `createStreamMerger` 函数，返回增量合并器，支持逐事件合并。

#### Scenario: 创建合并器
- **WHEN** 调用 `createStreamMerger()`
- **THEN** 返回包含 `push(event)` 和 `getMessage()` 方法的合并器对象

#### Scenario: 逐事件推送
- **WHEN** 调用 `push(event)` 推送 RuntimeEvent
- **THEN** 合并器内部累积状态

#### Scenario: 获取当前消息
- **WHEN** 调用 `getMessage()`
- **THEN** 若已收到 `finish` 事件，返回完整 `LLMAssistantMessage`
- **AND** 若未收到 `finish` 事件，返回 `null`
