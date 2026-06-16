# ReAct 循环规格

## Purpose

定义 ReAct (Reasoning + Acting) 循环的架构和行为，包括显式的 Think-Act-Observe-Decide 阶段、状态跟踪和终止逻辑。

## Requirements

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

### 需求：系统 SHALL 支持可配置的迭代限制

系统 SHALL 支持可配置的最大迭代限制以防止无限循环。默认值 SHALL 为 10 次迭代。当达到限制时，系统 SHALL 优雅终止并返回最佳可用响应。

#### 场景：达到迭代限制

- **WHEN** ReAct 循环达到配置的最大迭代限制
- **THEN** 系统 SHALL 终止循环
- **AND** 系统 SHALL 返回最后的 LLM 响应（如果可用）
- **AND** 系统 SHALL 在响应元数据中包含迭代次数

#### 场景：未达到迭代限制

- **WHEN** ReAct 循环在达到迭代限制前完成
- **THEN** 系统 SHALL 返回最终响应
- **AND** 系统 SHALL 不强制提前终止

### 需求：系统 SHALL 允许 LLM 决定终止

系统 SHALL 允许 LLM 通过提供不含工具调用的最终答案来终止 ReAct 循环。系统 SHALL 将此识别为终止信号并结束循环。

#### 场景：LLM 提供最终答案

- **WHEN** LLM 响应包含内容且无工具调用
- **THEN** 系统 SHALL 将此识别为终止信号
- **AND** 系统 SHALL 结束 ReAct 循环
- **AND** 系统 SHALL 将内容作为最终答案返回

#### 场景：LLM 继续使用工具

- **WHEN** LLM 响应包含工具调用
- **THEN** 系统 SHALL 继续进入 Observe 阶段
- **AND** 系统 SHALL 不终止循环

### 需求：系统 SHALL 跟踪 ReAct 阶段状态

系统 SHALL 维护当前 ReAct 阶段的显式状态跟踪。状态 SHALL 可检查以供调试和日志使用。

#### 场景：阶段状态跟踪

- **WHEN** ReAct 循环执行
- **THEN** 系统 SHALL 跟踪当前阶段（thinking、acting、observing、deciding）
- **AND** 系统 SHALL 在每次转换时更新阶段
- **AND** 系统 SHALL 在状态对象中保存阶段历史

#### 场景：阶段状态检查

- **WHEN** 开发者或调试器检查循环状态
- **THEN** 系统 SHALL 提供当前阶段信息
- **AND** 系统 SHALL 提供阶段转换历史

### 需求：系统 SHALL 优雅处理错误

系统 SHALL 在 ReAct 循环执行中处理错误而不崩溃。错误 SHALL 转换为 LLM 可处理的观察结果，以决定下一步。

#### 场景：工具执行错误

- **WHEN** 工具在 Observe 阶段执行失败
- **THEN** 系统 SHALL 创建错误观察结果
- **AND** 系统 SHALL 在观察结果中包含错误详情
- **AND** 系统 SHALL 允许 LLM 决定如何处理错误

#### 场景：LLM API 错误

- **WHEN** LLM API 在 Think 或 Act 阶段调用失败
- **THEN** 系统 SHALL 根据配置的重试策略进行重试
- **AND** 系统 SHALL 在重试耗尽时以错误终止
- **AND** 系统 SHALL 提供有意义的错误信息

### 需求：系统 SHALL 维护行动历史

系统 SHALL 维护 ReAct 循环中执行操作的完整历史。此历史 SHALL 可供 LLM 推理和开发者调试使用。

#### 场景：行动历史累积

- **WHEN** 在 ReAct 循环中执行工具
- **THEN** 系统 SHALL 在行动历史中记录每个操作
- **AND** 系统 SHALL 包含工具名称、参数和结果
- **AND** 系统 SHALL 保持时间顺序

#### 场景：行动历史访问

- **WHEN** LLM 在 Think 阶段进行推理
- **THEN** 系统 SHALL 提供对行动历史的访问
- **AND** 系统 SHALL 格式化历史以供 LLM 使用
