## MODIFIED Requirements

### 需求：系统 SHALL 实现带显式阶段的 ReAct 循环

系统 SHALL 实现 ReAct（Reasoning + Acting）循环，通过四个不同阶段处理用户输入：Think、Act、Observe 和 Decide。每个阶段 SHALL 有显式的状态跟踪和转换。Act 阶段 SHALL 使用 `provider.chatStream()` 流式调用 LLM，并通过事件回调将 RuntimeEvent 透传给调用方。系统 SHALL NOT 保留旧循环（sendMessageLegacy / sendMessageLegacyStream）代码。

#### 场景：带工具执行的完整 ReAct 周期

- **WHEN** 用户提供需要使用工具的输入
- **THEN** 系统 SHALL 依次经历 Think → Act → Observe → Decide 阶段
- **AND** 系统 SHALL 在 Act 阶段流式调用 LLM
- **AND** 系统 SHALL 通过 onEvent 回调透传 RuntimeEvent（text-delta、tool-call-start 等 ProviderEvent，以及 iteration-start、phase-change 等 lifecycle 事件）
- **AND** 系统 SHALL 在 Observe 阶段执行工具调用
- **AND** 系统 SHALL 在 Observe 阶段收集工具结果
- **AND** 系统 SHALL 在 Decide 阶段评估是否终止

#### 场景：不带工具执行的 ReAct 周期

- **WHEN** 用户提供不需要工具的输入
- **THEN** 系统 SHALL 依次经历 Think → Act → Decide 阶段
- **AND** 系统 SHALL 在 Act 阶段流式调用 LLM
- **AND** 系统 SHALL 通过 onEvent 回调透传 text-delta 事件
- **AND** 系统 SHALL 不执行任何工具
- **AND** 系统 SHALL 直接提供最终答案

#### 场景：流式响应中断

- **WHEN** Act 阶段流式调用中途断开（未收到 finish 事件）
- **THEN** 系统 SHALL 将此视为空响应
- **AND** 系统 SHALL 终止循环
- **AND** 系统 SHALL 发出 loop-end 事件，reason 为 "empty_response"

## REMOVED Requirements

### 需求：旧循环模式（递归模式）
**Reason**: 旧循环（sendMessageLegacy / sendMessageLegacyStream）已被 ReAct 循环完全替代，USE_REACT_LOOP 开关无保留必要。删除后入口层只保留 ReAct 循环路径。
**Migration**: 统一使用 ReAct 循环（executeReActLoop），不再支持旧循环模式。
