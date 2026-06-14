# Stream Adapter 规格

## Purpose

定义 LLM 适配器的流式 chunk 转换能力，将提供商 SSE chunk 转换为 RuntimeEvent。

## Requirements

### Requirement: 流式 chunk 转换方法

系统 SHALL 在 LLMAdapter 接口提供可选的 `transformStreamChunk` 方法，将提供商 SSE chunk 转换为 RuntimeEvent。

#### Scenario: 转换有效 chunk
- **WHEN** 调用 `transformStreamChunk(chunk)` 且 chunk 包含有意义的内容
- **THEN** 方法 SHALL 返回对应的 `RuntimeEvent`

#### Scenario: 跳过无意义 chunk
- **WHEN** 调用 `transformStreamChunk(chunk)` 且 chunk 不包含有意义的内容（如仅含 role 声明的首帧）
- **THEN** 方法 SHALL 返回 `null`

### Requirement: DeepSeek 流式 chunk 转换实现

系统 SHALL 提供 DeepSeek 提供商的 `transformStreamChunk` 实现。

#### Scenario: 转换文本内容 chunk
- **WHEN** DeepSeek SSE chunk 的 `choices[0].delta.content` 非空
- **THEN** 转换器 SHALL 返回 `{ type: 'text-delta', delta: content }` 事件

#### Scenario: 转换工具调用开始 chunk
- **WHEN** DeepSeek SSE chunk 的 `choices[0].delta.tool_calls[i]` 包含 `id` 和 `function.name`
- **THEN** 转换器 SHALL 返回 `{ type: 'tool-call-start', toolCallId: id, toolName: name }` 事件
- **AND** 转换器 SHALL 将工具名中的 `-` 还原为 `.`（遵循 adaptor 封装规则）

#### Scenario: 转换工具调用参数增量 chunk
- **WHEN** DeepSeek SSE chunk 的 `choices[0].delta.tool_calls[i].function.arguments` 非空
- **THEN** 转换器 SHALL 返回 `{ type: 'tool-call-delta', toolCallId, argumentsDelta }` 事件

#### Scenario: 转换完成 chunk
- **WHEN** DeepSeek SSE chunk 的 `choices[0].finish_reason` 非空
- **THEN** 转换器 SHALL 返回 `{ type: 'finish', reason }` 事件

#### Scenario: 处理多工具调用 index
- **WHEN** 同一响应中包含多个工具调用
- **THEN** 转换器 SHALL 通过 `tool_calls[i].index` 正确关联同一工具调用的 start/delta chunk
