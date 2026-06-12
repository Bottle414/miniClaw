## ADDED Requirements

### Requirement: 系统 SHALL 定义 ReAct 事件类型

系统 SHALL 定义 `ReActEvent` discriminated union 类型，包含两类事件：透传的 LLM 流式事件（text-delta、tool-call-start、tool-call-delta、tool-call-end、finish、error）和 ReAct 循环层级事件（react-iteration-start、react-phase-change、react-tool-execute、react-tool-result、react-loop-end）。

#### Scenario: LLM 流式事件透传

- **WHEN** ReAct 循环 Act 阶段通过 `provider.chatStream()` 接收到 RuntimeEvent
- **THEN** 系统 SHALL 将该事件作为 ReActEvent 透传给调用方
- **AND** 透传事件的 type 字段 SHALL 与原始 RuntimeEvent 一致

#### Scenario: ReAct 循环层级事件

- **WHEN** ReAct 循环进入新迭代、切换阶段、执行工具或循环结束
- **THEN** 系统 SHALL 发出对应的 react- 前缀事件
- **AND** react-iteration-start SHALL 包含 iteration 字段
- **AND** react-phase-change SHALL 包含 phase 和 iteration 字段
- **AND** react-tool-execute SHALL 包含 toolCallId 和 toolName 字段
- **AND** react-tool-result SHALL 包含 toolCallId、toolName、result 和 success 字段
- **AND** react-loop-end SHALL 包含 reason 和 iterations 字段

### Requirement: 系统 SHALL 支持事件回调

系统 SHALL 在 ReActLoopConfig 中提供可选的 `onEvent` 回调函数，用于将 ReActEvent 传递给调用方。

#### Scenario: 传入 onEvent 回调

- **WHEN** 调用方在 ReActLoopConfig 中提供 onEvent 回调
- **THEN** 系统 SHALL 在每个事件发生时调用 onEvent
- **AND** 事件 SHALL 按发生顺序传递

#### Scenario: 不传入 onEvent 回调

- **WHEN** 调用方未在 ReActLoopConfig 中提供 onEvent 回调
- **THEN** 系统 SHALL 正常执行 ReAct 循环
- **AND** 行为 SHALL 与不传回调时完全一致

#### Scenario: onEvent 回调抛出异常

- **WHEN** onEvent 回调函数抛出异常
- **THEN** 系统 SHALL 捕获该异常
- **AND** 系统 SHALL 不中断 ReAct 循环执行
- **AND** 系统 SHALL 记录错误信息

### Requirement: 系统 SHALL 在迭代开始时发出事件

系统 SHALL 在每次 ReAct 迭代开始时发出 `react-iteration-start` 事件。

#### Scenario: 首次迭代

- **WHEN** ReAct 循环进入第一次迭代
- **THEN** 系统 SHALL 发出 react-iteration-start 事件
- **AND** iteration 字段 SHALL 为 0

#### Scenario: 后续迭代

- **WHEN** ReAct 循环进入第 N 次迭代
- **THEN** 系统 SHALL 发出 react-iteration-start 事件
- **AND** iteration 字段 SHALL 为 N

### Requirement: 系统 SHALL 在阶段转换时发出事件

系统 SHALL 在 ReAct 循环阶段转换时发出 `react-phase-change` 事件。

#### Scenario: Think 到 Act 转换

- **WHEN** ReAct 循环从 thinking 阶段转换到 acting 阶段
- **THEN** 系统 SHALL 发出 react-phase-change 事件
- **AND** phase SHALL 为 "acting"

#### Scenario: Act 到 Observe 转换

- **WHEN** ReAct 循环检测到工具调用并进入 observing 阶段
- **THEN** 系统 SHALL 发出 react-phase-change 事件
- **AND** phase SHALL 为 "observing"

#### Scenario: Observe 到 Decide 转换

- **WHEN** 工具执行完毕进入 deciding 阶段
- **THEN** 系统 SHALL 发出 react-phase-change 事件
- **AND** phase SHALL 为 "deciding"

### Requirement: 系统 SHALL 在工具执行时发出事件

系统 SHALL 在 Observe 阶段执行工具时发出 `react-tool-execute` 和 `react-tool-result` 事件。

#### Scenario: 工具开始执行

- **WHEN** 系统开始执行某个工具
- **THEN** 系统 SHALL 发出 react-tool-execute 事件
- **AND** 事件 SHALL 包含 toolCallId 和 toolName

#### Scenario: 工具执行成功

- **WHEN** 工具执行成功并返回结果
- **THEN** 系统 SHALL 发出 react-tool-result 事件
- **AND** success SHALL 为 true
- **AND** result SHALL 包含工具返回值

#### Scenario: 工具执行失败

- **WHEN** 工具执行抛出异常
- **THEN** 系统 SHALL 发出 react-tool-result 事件
- **AND** success SHALL 为 false
- **AND** result SHALL 包含错误信息

### Requirement: 系统 SHALL 在循环结束时发出事件

系统 SHALL 在 ReAct 循环结束时发出 `react-loop-end` 事件。

#### Scenario: 正常结束（最终答案）

- **WHEN** ReAct 循环因 LLM 提供最终答案而终止
- **THEN** 系统 SHALL 发出 react-loop-end 事件
- **AND** reason SHALL 为 "final_answer"

#### Scenario: 迭代限制

- **WHEN** ReAct 循环因达到最大迭代次数而终止
- **THEN** 系统 SHALL 发出 react-loop-end 事件
- **AND** reason SHALL 为 "iteration_limit"

#### Scenario: 错误终止

- **WHEN** ReAct 循环因错误而终止
- **THEN** 系统 SHALL 发出 react-loop-end 事件
- **AND** reason SHALL 为 "error"
