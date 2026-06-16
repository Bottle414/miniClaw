## 1. 事件类型扩展

- [x] 1.1 在 `types/event/runtime-event.ts` 中新增 `LoopCompleteEvent` 接口，包含 `state: ReActState`、`response?: string`、`error?: Error`、`summaryResults: SummaryResult[]`
- [x] 1.2 将 `LoopCompleteEvent` 加入 `RuntimeEvent` 联合类型（独立于 `RuntimeLifecycleEvent`）
- [x] 1.3 更新 `types/event/index.ts` 导出 `LoopCompleteEvent`

## 2. executeReActLoop 改造为 AsyncGenerator

- [x] 2.1 将 `executeReActLoop` 签名从 `async function` 改为 `async function*`，返回类型改为 `AsyncIterable<RuntimeEvent>`
- [x] 2.2 从 `ReActLoopConfig` 中删除 `onEvent` 字段
- [x] 2.3 删除 `emitEvent` 辅助函数
- [x] 2.4 主循环中所有 `emitEvent(onEvent, event)` 调用替换为 `yield event`
- [x] 2.5 改造 `executeThinkPhase`：返回需要 yield 的事件数组，由主循环统一 yield
- [x] 2.6 改造 `executeActPhase`：返回 ProviderEvent 数组 + 结果对象，由主循环统一 yield ProviderEvent；删除 contextMessages 的 console.log 调试打印
- [x] 2.7 改造 `executeObservePhase`：返回 ToolExecuteEvent/ToolResultEvent 数组 + 新 state，由主循环统一 yield
- [x] 2.8 改造 `executeDecidePhase`：返回 PhaseChangeEvent 数组 + 新 state，由主循环统一 yield
- [x] 2.9 循环结束后 yield `LoopEndEvent`，再 yield `LoopCompleteEvent`（携带最终 state、response、summaryResults）
- [x] 2.10 错误处理：内部 try/catch 统一捕获，yield ErrorEvent + LoopCompleteEvent（error 字段），不 throw

## 3. main 入口改造

- [x] 3.1 `sendMessageReAct` 改为 `for await (const event of executeReActLoop(config))` 消费事件
- [x] 3.2 将原 `onEvent` 回调中的 switch 逻辑移入 `for await...of` 循环体
- [x] 3.3 处理 `LoopCompleteEvent`：从中提取 state/response/summaryResults，替代原 `result` 返回值
- [x] 3.4 删除 `sendMessageReAct` 中对 `result.state.messages` 的依赖，改用 LoopCompleteEvent 中的数据
- [x] 3.5 删除 `getContextMessages` 和 `logContextMessages` 函数（调试打印已从 runtime 移除）

## 4. 清理与验证

- [x] 4.1 删除 `ReActLoopResult` 接口（结果已通过 LoopCompleteEvent 传递）
- [x] 4.2 确认 runtime 内部无残留 console.log/console.error/readline
- [x] 4.3 确认 `emitEvent` 函数已完全删除
- [x] 4.4 TypeScript 编译通过，无类型错误
- [x] 4.5 手动运行验证：CLI 流式输出、工具调用、错误处理均正常
