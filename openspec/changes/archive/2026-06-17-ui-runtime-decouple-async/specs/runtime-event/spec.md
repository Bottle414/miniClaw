## ADDED Requirements

### Requirement: LoopCompleteEvent 类型定义

系统 SHALL 定义 `LoopCompleteEvent`，作为 runtime 循环的最终结果事件。LoopCompleteEvent SHALL 包含 `state: ReActState`、`response?: string`、`error?: Error`、`summaryResults: SummaryResult[]`。LoopCompleteEvent SHALL 作为 `executeReActLoop` yield 的最后一个事件。

#### Scenario: 成功完成
- **WHEN** ReAct 循环正常结束
- **THEN** 系统 SHALL yield LoopCompleteEvent，包含最终 state、response 和 summaryResults，error 为 undefined

#### Scenario: 错误完成
- **WHEN** ReAct 循环因内部错误结束
- **THEN** 系统 SHALL yield LoopCompleteEvent，包含 error 字段和当前 state

#### Scenario: 消费者获取结果
- **WHEN** 消费者收到 LoopCompleteEvent
- **THEN** 消费者 SHALL 可从该事件获取完整的循环结果，无需依赖函数返回值
