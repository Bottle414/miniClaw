# Chat API 规格

## Purpose

定义 `chat` 方法，封装 executeReActLoop 调用，内部管理 messages/memory/summarizer，为外部提供简洁的对话接口。

## ADDED Requirements

### Requirement: chat 方法签名

系统 SHALL 提供 `chat(userInput: string, contextOptions?: ContextBuilderOptions): AsyncIterable<RuntimeEvent>` 方法。chat SHALL 内部调用 executeReActLoop 并透传其产出的 RuntimeEvent。

#### Scenario: 基本对话
- **WHEN** 调用 `chat("你好")`
- **THEN** 系统 SHALL 返回 AsyncIterable<RuntimeEvent>
- **AND** 调用方 SHALL 可通过 `for await...of` 实时消费事件
- **AND** 系统 SHALL 内部将 userInput 构造为 LLMUserMessage 并传入 executeReActLoop

#### Scenario: 带上下文选项的对话
- **WHEN** 调用 `chat("你好", { preserveRecentMessages: 5 })`
- **THEN** 系统 SHALL 将 contextOptions 传入 executeReActLoop
- **AND** 系统 SHALL NOT 将 contextOptions 以外的参数暴露给调用方

### Requirement: chat 内部管理 messages 和 memory

chat 方法 SHALL 在内部管理 messages 数组和 RuntimeMemoryState。每轮 chat 完成后，SHALL 自动将 loop-complete 中的新消息追加到内部 messages，将 summaryResults 更新到内部 memory。

#### Scenario: 多轮对话状态保持
- **WHEN** 连续调用 `chat("第一轮")` 和 `chat("第二轮")`
- **THEN** 第二轮 chat SHALL 能访问第一轮的消息历史
- **AND** 系统 SHALL 自动维护 messages 数组的连续性

#### Scenario: 摘要结果自动更新到 memory
- **WHEN** chat 完成后 loop-complete 包含 summaryResults
- **THEN** 系统 SHALL 将每个 summary 作为 session memory 条目注入
- **AND** 系统 SHALL 将每个 extractedFact 作为 session memory 条目注入

### Requirement: chat 自动持久化 session

chat 方法 SHALL 在循环完成后自动调用 `sessionManager.save(session)` 更新 session 的 messages、summary、facts。

#### Scenario: chat 后 session 自动保存
- **WHEN** chat 方法消费完所有 RuntimeEvent 后
- **THEN** 系统 SHALL 将更新后的 messages 写入 session.messages
- **AND** 系统 SHALL 将新的 summaryResults 追加到 session.summary
- **AND** 系统 SHALL 将新的 facts 追加到 session.facts
- **AND** 系统 SHALL 调用 `sessionManager.save(session)`

#### Scenario: chat 中途出错 session 仍保存
- **WHEN** chat 过程中 loop-complete 包含 error
- **THEN** 系统 SHALL 仍保存当前已有的消息到 session
- **AND** 系统 SHALL NOT 抛出异常中断调用方

### Requirement: chat 封装 summarizer

chat 方法 SHALL 内部创建和使用 summarizer，SHALL NOT 将 summarizer 暴露给调用方。调用方 SHALL NOT 需要知道 summarizer 的存在。

#### Scenario: summarizer 自动使用
- **WHEN** 调用 chat 方法
- **THEN** 系统 SHALL 内部使用 createRuntime 时创建的 LLM summarizer
- **AND** 调用方 SHALL NOT 需要传入 summarizer

### Requirement: chat 非并发安全

chat 方法 SHALL NOT 支持并发调用。同一 runtime 实例在同一时间只能有一个 chat 调用正在消费事件。

#### Scenario: 并发调用 chat
- **WHEN** 在前一个 chat 的 AsyncIterable 尚未消费完毕时再次调用 chat
- **THEN** 行为未定义（SHALL NOT 保证正确性）
