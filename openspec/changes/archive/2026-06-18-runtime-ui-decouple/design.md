## Context

当前 `apps/runtime/src/index.ts` 是一个副作用入口，混合了三类职责：
1. **Runtime 初始化**：dotenv 加载、config 创建、provider 初始化、memory/summarizer/sessionManager 创建
2. **ReAct 循环调用**：构造 executeReActLoop 参数、消费 RuntimeEvent、更新 messages/memory、持久化 session
3. **TUI 交互**：readline 输入、process.stdout 输出、console.log 状态展示

项目已有 `apps/tui` 空壳目录和 `apps/web` React 应用，但都无法接入 runtime，因为 runtime 没有暴露可编程的 API。

## Goals / Non-Goals

**Goals:**
- 将 runtime 封装为 `createRuntime()` 工厂，返回 `{ chat, sessionManager, config }`
- `chat(userInput, contextOptions?)` 封装 executeReActLoop，内部管理 messages/memory/summarizer，返回 `AsyncIterable<RuntimeEvent>`
- chat 完成后自动更新内部 messages/memory 状态，并持久化 session
- 将 TUI 交互逻辑迁移到 `apps/tui/src/index.ts`
- runtime 包仅导出 `createRuntime` 及必要类型，不再有副作用入口

**Non-Goals:**
- 不修改 executeReActLoop 内部实现或 ReActLoopConfig 接口
- 不修改 RuntimeEvent 类型协议
- 不实现 Web UI 接入（仅预留能力）
- 不做 runtime 的 npm 发布配置
- 不引入新的外部依赖

## Decisions

### D1: createRuntime 使用函数+闭包模式

**选择**: `createRuntime(options)` 返回闭包对象，内部持有 provider、messages、memory、summarizer、session 等状态。

**理由**: 符合项目编码约定（函数+闭包优于类），与 DeepSeekProvider、createSessionManager 等现有模式一致。

**备选**: 使用 class，但违反项目约定。

### D2: chat 方法返回 AsyncIterable<RuntimeEvent>

**选择**: `chat(userInput, contextOptions?): AsyncIterable<RuntimeEvent>` 直接返回 executeReActLoop 的 AsyncIterable。

**理由**: 调用方可以 `for await...of` 实时消费事件，与现有 TUI 和未来 Web UI 的流式渲染需求一致。无需引入回调或 Promise 包装。

**备选**: chat 返回 Promise 并通过 onEvent 回调推送事件，但项目约定禁止 onEvent 模式。

### D3: chat 内部管理 session 持久化

**选择**: chat 方法在循环结束后自动更新 messages/memory/session 状态并调用 `sessionManager.save()`。

**理由**: session 持久化是 runtime 的内部职责，外部调用方不应关心。这简化了 chat API，调用方只需消费事件。

**备选**: 让调用方在 loop-complete 事件后手动调用 save，但增加了调用方的复杂度且容易遗漏。

### D4: createRuntime 接受 RuntimeOptions

**选择**: `createRuntime(options: RuntimeOptions)` 接受配置对象，包含 `env`（环境变量源）、`sessionsRoot`（可选，session 存储路径）。

**理由**: 避免硬依赖 `process.env`，使 runtime 可在 Web Worker 等非 Node 环境中测试。dotenv 加载仍由调用方（TUI 入口）负责。

### D5: chat 后内部状态自动更新

**选择**: chat 方法内部持有 messages 和 memory 的可变引用，循环完成后自动追加新消息和摘要结果。

**理由**: 多轮对话场景下，调用方无需手动管理 messages 和 memory 状态。chat 是有副作用的，这符合"runtime 负责增改"的设计意图。

## Risks / Trade-offs

- **[chat 有副作用]** → chat 会修改内部 messages/memory/session 状态，调用方需注意不要在 chat 迭代期间再次调用 chat。文档中说明 chat 不是并发安全的。
- **[RuntimeEvent 不含 chat-complete 事件]** → loop-complete 已包含最终状态和 summaryResults，不需要额外事件。调用方在迭代结束后即可获取结果。如果未来需要区分"循环完成"和"chat 后处理完成"，可新增事件。
- **[TUI 迁移后 runtime 无直接入口]** → runtime 包不再有 `main` 字段指向可执行入口，改为由 `apps/tui` 作为可执行入口。
