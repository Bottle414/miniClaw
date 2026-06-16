# Runtime Event 规格

## Purpose

定义 LLM provider 流式输出的标准事件协议（ProviderEvent），作为 provider 层与 runtime 之间的通信契约。

## Requirements

### Requirement: Runtime Event 类型定义

系统 SHALL 提供 `ProviderEvent` discriminated union 类型，作为 LLM provider 流式输出的标准事件协议。ProviderEvent SHALL 包含 TextDeltaEvent、ToolCallStartEvent、ToolCallDeltaEvent、ToolCallEndEvent、FinishEvent、ErrorEvent。ProviderEvent SHALL NOT 包含 ToolResultEvent。

#### Scenario: 文本增量事件
- **WHEN** LLM 产出文本内容增量
- **THEN** 系统 SHALL 发出 `{ type: 'text-delta', delta: string }` 事件

#### Scenario: 工具调用开始事件
- **WHEN** LLM 开始产出工具调用
- **THEN** 系统 SHALL 发出 `{ type: 'tool-call-start', toolCallId: string, toolName: string }` 事件

#### Scenario: 工具调用参数增量事件
- **WHEN** LLM 产出工具调用参数增量
- **THEN** 系统 SHALL 发出 `{ type: 'tool-call-delta', toolCallId: string, argumentsDelta: string }` 事件

#### Scenario: 工具调用结束事件
- **WHEN** LLM 完成一个工具调用的参数输出
- **THEN** 系统 SHALL 发出 `{ type: 'tool-call-end', toolCallId: string, arguments: string }` 事件

#### Scenario: 完成事件
- **WHEN** LLM 完成响应
- **THEN** 系统 SHALL 发出 `{ type: 'finish', reason: LLMFinishReason, usage?: LLMUsage }` 事件

#### Scenario: 错误事件
- **WHEN** 流式处理过程中发生错误
- **THEN** 系统 SHALL 发出 `{ type: 'error', error: Error }` 事件

### Requirement: Runtime Event 类型安全

系统 SHALL 保证 ProviderEvent 的类型安全，通过 `type` 字段实现 discriminated union。

#### Scenario: 类型收窄
- **WHEN** 消费者通过 `type` 字段判断事件类型
- **THEN** TypeScript 编译器 SHALL 正确收窄对应事件的字段类型
