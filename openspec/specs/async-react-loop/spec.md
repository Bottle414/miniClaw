# Async ReAct Loop 规格

## Purpose

定义基于 AsyncIterable 的 ReAct 循环协议，消费者通过 `for await...of` 拉取事件，替代 onEvent 回调模式。

## Requirements

### Requirement: AsyncIterable ReAct 循环

系统 SHALL 提供 `executeReActLoop` 作为 `async function*`，返回 `AsyncIterable<RuntimeEvent>`。消费者 SHALL 通过 `for await...of` 拉取事件。`executeReActLoop` SHALL NOT 使用 `onEvent` 回调。

#### Scenario: 基本消费模式
- **WHEN** 调用方执行 `for await (const event of executeReActLoop(config))`
- **THEN** 系统 SHALL 按顺序 yield RuntimeEvent
- **AND** 消费者可通过 break/return 提前终止消费

#### Scenario: 背压挂起
- **WHEN** 消费者处理事件速度慢于 runtime 产出速度
- **THEN** generator SHALL 自动挂起，等待消费者取下一个事件
- **AND** LLM stream SHALL 暂停读取，避免内存堆积

#### Scenario: Session 隔离
- **WHEN** 多次调用 `executeReActLoop`
- **THEN** 每次调用 SHALL 返回独立的 AsyncIterable
- **AND** 不同 iterable 之间 SHALL NOT 共享状态或互相干扰

### Requirement: 事件 yield 协议

`executeReActLoop` SHALL 在以下节点 yield 对应事件：
- 循环开始每轮迭代：yield `IterationStartEvent`
- 阶段转换：yield `PhaseChangeEvent`
- Act 阶段 LLM 流式响应：yield `ProviderEvent`（text-delta、tool-call-start 等）
- Observe 阶段工具执行：yield `ToolExecuteEvent`、`ToolResultEvent`
- 循环结束：yield `LoopEndEvent`
- 最终结果：yield `LoopCompleteEvent`（作为最后一个事件）

#### Scenario: 完整 ReAct 周期的事件序列
- **WHEN** 用户输入触发带工具调用的 ReAct 循环
- **THEN** 事件序列 SHALL 为：iteration-start → phase-change(thinking) → phase-change(acting) → [ProviderEvent...] → phase-change(observing) → tool-execute → tool-result → phase-change(deciding) → [下一轮或] loop-end → loop-complete

#### Scenario: 无工具调用的事件序列
- **WHEN** LLM 直接给出最终答案
- **THEN** 事件序列 SHALL 为：iteration-start → phase-change(thinking) → phase-change(acting) → [ProviderEvent...] → loop-end → loop-complete

### Requirement: 输入契约

`ReActLoopConfig` SHALL 接受 `userInput: string` 作为唯一用户输入来源。runtime SHALL NOT 自行读取 stdin 或执行 readline。`ReActLoopConfig` SHALL NOT 包含 `onEvent` 字段。

#### Scenario: 用户输入通过参数传入
- **WHEN** 调用方传入 `userInput`
- **THEN** runtime SHALL 将其作为 LLMUserMessage 添加到消息历史
- **AND** runtime SHALL NOT 自行获取用户输入

### Requirement: 错误不 throw，通过事件暴露

runtime SHALL 在内部统一捕获所有错误，通过 yield `ErrorEvent` 和 `LoopCompleteEvent`（携带 error 字段）向外暴露结构化错误信息。runtime SHALL NOT 直接 throw 未捕获异常，以保证 RuntimeEvent stream 协议稳定。

#### Scenario: LLM API 错误
- **WHEN** provider.chatStream 调用失败
- **THEN** runtime SHALL yield ErrorEvent
- **AND** runtime SHALL yield LoopCompleteEvent（error 字段包含错误信息）
- **AND** runtime SHALL NOT throw

#### Scenario: 工具执行错误
- **WHEN** 工具执行抛出异常
- **THEN** runtime SHALL yield ToolResultEvent（success: false）
- **AND** runtime SHALL NOT throw，继续循环让 LLM 决定下一步

#### Scenario: 消费者提前终止
- **WHEN** 消费者在 `for await...of` 中 break 或 return
- **THEN** generator SHALL 自动清理并终止
- **AND** runtime SHALL NOT throw
