## ADDED Requirements

### Requirement: ProviderEvent 类型定义

系统 SHALL 提供 `ProviderEvent` discriminated union 类型，作为 LLM provider 流式输出的标准事件协议。ProviderEvent SHALL 包含以下事件类型：TextDeltaEvent、ToolCallStartEvent、ToolCallDeltaEvent、ToolCallEndEvent、FinishEvent、ErrorEvent。ProviderEvent SHALL NOT 包含 ToolResultEvent（工具执行结果属于 Runtime lifecycle 事件）。

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

### Requirement: RuntimeEvent 类型定义

系统 SHALL 提供 `RuntimeEvent` discriminated union 类型，作为 runtime 对外暴露的顶层事件类型。RuntimeEvent SHALL 包含 ProviderEvent（provider 流式事件）和 RuntimeLifecycleEvent（runtime 生命周期事件）。

#### Scenario: RuntimeEvent 包含 ProviderEvent
- **WHEN** provider 产出流式事件
- **THEN** 该事件 SHALL 作为 RuntimeEvent 的一部分传递给消费者

#### Scenario: RuntimeEvent 包含 lifecycle 事件
- **WHEN** runtime 循环状态发生变化
- **THEN** 系统 SHALL 发出对应的 RuntimeLifecycleEvent 作为 RuntimeEvent 的一部分

### Requirement: RuntimeLifecycleEvent 类型定义

系统 SHALL 定义 RuntimeLifecycleEvent 子类型，包含以下事件：IterationStartEvent、PhaseChangeEvent、ToolExecuteEvent、ToolResultEvent、LoopEndEvent。lifecycle 事件的 type 字段 SHALL NOT 包含模块前缀。

#### Scenario: 迭代开始事件
- **WHEN** runtime 循环进入新迭代
- **THEN** 系统 SHALL 发出 `{ type: 'iteration-start', iteration: number }` 事件

#### Scenario: 阶段转换事件
- **WHEN** runtime 循环阶段发生转换
- **THEN** 系统 SHALL 发出 `{ type: 'phase-change', phase: RuntimePhase, iteration: number }` 事件

#### Scenario: 工具执行开始事件
- **WHEN** runtime 开始执行工具
- **THEN** 系统 SHALL 发出 `{ type: 'tool-execute', toolCallId: string, toolName: string }` 事件

#### Scenario: 工具执行结果事件
- **WHEN** runtime 完成工具执行并得到结果
- **THEN** 系统 SHALL 发出 `{ type: 'tool-result', toolCallId: string, toolName: string, result: string, success: boolean }` 事件

#### Scenario: 循环结束事件
- **WHEN** runtime 循环结束
- **THEN** 系统 SHALL 发出 `{ type: 'loop-end', reason: TerminationReason | "empty_response", iterations: number }` 事件

### Requirement: RuntimeEvent 类型安全

系统 SHALL 保证 RuntimeEvent 和 ProviderEvent 的类型安全，通过 `type` 字段实现 discriminated union。

#### Scenario: 类型收窄
- **WHEN** 消费者通过 `type` 字段判断事件类型
- **THEN** TypeScript 编译器 SHALL 正确收窄对应事件的字段类型

### Requirement: 事件类型文件组织

ProviderEvent SHALL 定义在 `types/event/provider-event.ts`，RuntimeEvent 及 RuntimeLifecycleEvent SHALL 定义在 `types/event/runtime-event.ts`，两者 SHALL 通过 `types/event/index.ts` 统一导出。

#### Scenario: 导入路径
- **WHEN** 消费者需要使用 ProviderEvent
- **THEN** 消费者 SHALL 从 `types/event` 导入 ProviderEvent
- **WHEN** 消费者需要使用 RuntimeEvent
- **THEN** 消费者 SHALL 从 `types/event` 导入 RuntimeEvent
