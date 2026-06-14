## ADDED Requirements

### Requirement: 统一消息类型定义

系统 SHALL 提供与 LLM 提供商无关的消息类型定义。

#### Scenario 创建消息片段

- **WHEN** 业务代码创建消息片段

- **THEN** 系统提供 `Segment` 类型。暂时只包含文本类型碎片 `TextSegment`，包含 `type: "text"` 和 `text: string`

#### Scenario: 创建系统消息

- **WHEN** 业务代码创建系统消息

- **THEN** 系统提供 `LLMSystemMessage` 类型，包含 `role: "system"` 和 `content: Segment[]`

#### Scenario: 创建用户消息

- **WHEN** 业务代码创建用户消息

- **THEN** 系统提供 `LLMUserMessage` 类型，包含 `role: "user"` 和 `content: Segment[]`

#### Scenario: 创建助手消息

- **WHEN** 业务代码创建助手消息

- **THEN** 系统提供 `LLMAssistantMessage` 类型，包含 `role: "assistant"`、`content: Segment[]` 和可选的 `toolCalls`

#### Scenario: 创建工具消息

- **WHEN** 业务代码创建工具响应消息

- **THEN** 系统提供 `LLMToolMessage` 类型，包含 `role: "tool"`、`content: Segment[]` 和 `toolCallId: string`

### Requirement: 统一工具类型定义

系统 SHALL 提供与 LLM 提供商无关的工具类型定义。

#### Scenario: 定义工具函数

- **WHEN** 业务代码定义工具函数

- **THEN** 系统提供 `LLMTool` 类型，包含 `name`、`description` 和 ` parameters?: LLMFunctionParameters`

#### Scenario: 定义函数参数

- **WHEN** 业务代码定义函数参数 schema

- **THEN** 系统提供 `LLMFunctionParameters` 类型，支持 JSON Schema 格式

### Requirement: 统一请求类型定义

系统 SHALL 提供与 LLM 提供商无关的请求类型定义。

#### Scenario: 构建请求

- **WHEN** 业务代码构建 LLM 请求

- **THEN** 系统提供 `LLMRequest` 类型，包含 `messages`、`model` 和 `stream?: boolean`

#### Scenario: 请求包含工具

- **WHEN** 业务代码在请求中指定工具

- **THEN** 系统支持 `tools` 和 `toolChoice` 字段

### Requirement: 统一响应类型定义

系统 SHALL 提供与 LLM 提供商无关的响应类型定义。

#### Scenario: 解析响应

- **WHEN** 业务代码解析 LLM 响应

- **THEN** 系统提供 `LLMResponse` 类型，包含 `id`、可选的 `model`、可选的 `usage`、 `message: LLMAssistantMessage` 等字段

#### Scenario: 响应包含工具调用

- **WHEN** LLM 返回工具调用

- **THEN** 响应消息的 `toolCalls` 字段包含工具调用信息，`toolCall` 包含 `id`、`name` 和可选的 `arguments: string`，抽离为 `LLMToolCall` 字段

### Requirement: 流式 chunk 类型定义

系统 SHALL 提供 `LLMStreamChunk` 类型，表示流式响应的单个 chunk。

#### Scenario: 定义流式 chunk
- **WHEN** 业务代码处理流式响应
- **THEN** 系统提供 `LLMStreamChunk` 类型，包含 `id: string`、`model?: string`、`choices: LLMStreamChoice[]`

#### Scenario: 定义流式 choice
- **WHEN** 业务代码解析流式 chunk 的 choice
- **THEN** 系统提供 `LLMStreamChoice` 类型，包含 `index: number`、`delta: LLMStreamDelta`、`finishReason: LLMFinishReason | null`

#### Scenario: 定义流式 delta
- **WHEN** 业务代码解析流式增量内容
- **THEN** 系统提供 `LLMStreamDelta` 类型，包含可选的 `content: string`、可选的 `toolCalls: LLMStreamToolCall[]`、可选的 `role: LLMRole`

#### Scenario: 定义流式工具调用增量
- **WHEN** 业务代码解析流式工具调用增量
- **THEN** 系统提供 `LLMStreamToolCall` 类型，包含 `index: number`、可选的 `id: string`、可选的 `function: { name?: string; arguments?: string }`