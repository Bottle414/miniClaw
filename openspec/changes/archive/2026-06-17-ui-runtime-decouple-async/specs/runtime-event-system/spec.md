## MODIFIED Requirements

### Requirement: RuntimeEvent 类型定义

系统 SHALL 提供 `RuntimeEvent` discriminated union 类型，作为 runtime 对外暴露的顶层事件类型。RuntimeEvent SHALL 包含 ProviderEvent（provider 流式事件）、RuntimeLifecycleEvent（runtime 生命周期事件）和 LoopCompleteEvent（循环最终结果事件）。

#### Scenario: RuntimeEvent 包含 ProviderEvent
- **WHEN** provider 产出流式事件
- **THEN** 该事件 SHALL 作为 RuntimeEvent 的一部分被 yield 给消费者

#### Scenario: RuntimeEvent 包含 lifecycle 事件
- **WHEN** runtime 循环状态发生变化
- **THEN** 系统 SHALL yield 对应的 RuntimeLifecycleEvent 作为 RuntimeEvent 的一部分

#### Scenario: RuntimeEvent 包含 LoopCompleteEvent
- **WHEN** runtime 循环结束并产出最终结果
- **THEN** 系统 SHALL yield LoopCompleteEvent 作为 RuntimeEvent 的一部分

### Requirement: RuntimeLifecycleEvent 类型定义

系统 SHALL 定义 RuntimeLifecycleEvent 子类型，包含以下事件：IterationStartEvent、PhaseChangeEvent、ToolExecuteEvent、ToolResultEvent、LoopEndEvent。LoopCompleteEvent SHALL NOT 属于 RuntimeLifecycleEvent，而是 RuntimeEvent 的独立成员。lifecycle 事件的 type 字段 SHALL NOT 包含模块前缀。

#### Scenario: 迭代开始事件
- **WHEN** runtime 循环进入新迭代
- **THEN** 系统 SHALL yield `{ type: 'iteration-start', iteration: number }` 事件

#### Scenario: 阶段转换事件
- **WHEN** runtime 循环阶段发生转换
- **THEN** 系统 SHALL yield `{ type: 'phase-change', phase: RuntimePhase, iteration: number }` 事件

#### Scenario: 工具执行开始事件
- **WHEN** runtime 开始执行工具
- **THEN** 系统 SHALL yield `{ type: 'tool-execute', toolCallId: string, toolName: string }` 事件

#### Scenario: 工具执行结果事件
- **WHEN** runtime 完成工具执行并得到结果
- **THEN** 系统 SHALL yield `{ type: 'tool-result', toolCallId: string, toolName: string, result: string, success: boolean }` 事件

#### Scenario: 循环结束事件
- **WHEN** runtime 循环结束
- **THEN** 系统 SHALL yield `{ type: 'loop-end', reason: TerminationReason | "empty_response", iterations: number }` 事件

#### Scenario: 循环完成事件
- **WHEN** runtime 循环产出最终结果
- **THEN** 系统 SHALL yield `{ type: 'loop-complete', state: ReActState, response?: string, error?: Error, summaryResults: SummaryResult[] }` 事件
