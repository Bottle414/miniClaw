## MODIFIED Requirements

### 需求：系统 SHALL 实现带显式阶段的 ReAct 循环

系统 SHALL 实现 ReAct（Reasoning + Acting）循环，通过四个不同阶段处理用户输入：Think、Act、Observe 和 Decide。每个阶段 SHALL 有显式的状态跟踪和转换。Act 阶段 SHALL 使用 `provider.chatStream()` 流式调用 LLM，并通过 yield 将 RuntimeEvent 产出给调用方。系统 SHALL NOT 保留旧循环（sendMessageLegacy / sendMessageLegacyStream）代码。系统 SHALL NOT 使用 onEvent 回调。

#### 场景：带工具执行的完整 ReAct 周期

- **WHEN** 用户提供需要使用工具的输入
- **THEN** 系统 SHALL 依次经历 Think → Act → Observe → Decide 阶段
- **AND** 系统 SHALL 在 Act 阶段流式调用 LLM
- **AND** 系统 SHALL 通过 yield 产出 RuntimeEvent（text-delta、tool-call-start 等 ProviderEvent，以及 iteration-start、phase-change 等 lifecycle 事件）
- **AND** 系统 SHALL 在 Observe 阶段执行工具调用
- **AND** 系统 SHALL 在 Observe 阶段收集工具结果
- **AND** 系统 SHALL 在 Decide 阶段评估是否终止

#### 场景：不带工具执行的 ReAct 周期

- **WHEN** 用户提供不需要工具的输入
- **THEN** 系统 SHALL 依次经历 Think → Act → Decide 阶段
- **AND** 系统 SHALL 在 Act 阶段流式调用 LLM
- **AND** 系统 SHALL 通过 yield 产出 text-delta 事件
- **AND** 系统 SHALL 不执行任何工具
- **AND** 系统 SHALL 直接提供最终答案

#### 场景：流式响应中断

- **WHEN** Act 阶段流式调用中途断开（未收到 finish 事件）
- **THEN** 系统 SHALL 将此视为空响应
- **AND** 系统 SHALL 终止循环
- **AND** 系统 SHALL yield loop-end 事件，reason 为 "empty_response"

## REMOVED Requirements

### 需求：系统 SHALL 通过 onEvent 回调透传 RuntimeEvent
**Reason**: onEvent 回调模式被 AsyncIterable yield 模式替代，消费者通过 `for await...of` 拉取事件
**Migration**: 将 `onEvent` 回调逻辑改为 `for await...of` 循环体内的事件处理
