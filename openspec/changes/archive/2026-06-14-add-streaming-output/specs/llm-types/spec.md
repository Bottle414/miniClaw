## ADDED Requirements

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
