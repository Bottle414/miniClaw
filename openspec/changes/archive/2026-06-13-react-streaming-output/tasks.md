## 1. 类型定义

- [x] 1.1 在 `types/react/` 中定义 `ReActEvent` discriminated union 类型，包含透传的 LLM 流式事件（text-delta、tool-call-start、tool-call-delta、tool-call-end、finish、error）和 ReAct 循环层级事件（react-iteration-start、react-phase-change、react-tool-execute、react-tool-result、react-loop-end）
- [x] 1.2 在 `types/react/index.ts` 中导出 `ReActEvent` 及相关辅助类型（如 `ReActLoopEvent`、`ReActPhaseEvent` 等子集类型）
- [x] 1.3 在 `types/index.ts` 中添加 `ReActEvent` 的 re-export

## 2. 回调接口扩展

- [x] 2.1 在 `ReActLoopConfig`（`react/loop.ts`）中添加可选的 `onEvent?: (event: ReActEvent) => void` 字段
- [x] 2.2 创建安全的回调调用辅助函数 `emitEvent(onEvent, event)`，内部 try-catch 包裹，回调异常时记录但不中断循环

## 3. ReAct 循环流式改造

- [x] 3.1 改造 `executeActPhase()`：从 `provider.chat()` 切换到 `provider.chatStream()`，使用 `createStreamMerger()` 累积事件，同时通过 `onEvent` 透传每个 RuntimeEvent
- [x] 3.2 改造 `executeActPhase()` 处理流式中断：当 `merger.getMessage()` 返回 null 时，视为空响应，返回 `hasToolCalls: false`
- [x] 3.3 改造 `executeThinkPhase()`：在阶段转换时通过 `onEvent` 发出 `react-phase-change` 事件
- [x] 3.4 改造 `executeObservePhase()`：在工具执行前发出 `react-tool-execute` 事件，执行后发出 `react-tool-result` 事件
- [x] 3.5 改造 `executeDecidePhase()`：在阶段转换时通过 `onEvent` 发出 `react-phase-change` 事件
- [x] 3.6 改造主循环 `executeReActLoop()`：在每次迭代开始时发出 `react-iteration-start` 事件，在循环结束时发出 `react-loop-end` 事件
- [x] 3.7 将 `onEvent` 参数逐层传递到所有阶段处理函数（executeThinkPhase、executeActPhase、executeObservePhase、executeDecidePhase）

## 4. 调用方集成

- [x] 4.1 改造 `sendMessageReAct()`（`index.ts`）：传入 `onEvent` 回调，消费 ReActEvent 实现实时输出
- [x] 4.2 在 `sendMessageReAct` 中处理 `text-delta` 事件：`process.stdout.write(event.delta)` 逐 token 输出
- [x] 4.3 在 `sendMessageReAct` 中处理 `react-iteration-start` 事件：输出迭代信息（如"第 N 轮思考"）
- [x] 4.4 在 `sendMessageReAct` 中处理 `react-tool-execute` 和 `react-tool-result` 事件：输出工具调用状态
- [x] 4.5 在 `sendMessageReAct` 中处理 `react-loop-end` 事件：输出循环结束信息

## 5. 验证

- [x] 5.1 手动测试 ReAct 流式输出：执行一次带工具调用的对话，验证文字逐 token 呈现
- [x] 5.2 手动测试多轮迭代：验证迭代边界事件正确发出
- [x] 5.3 验证向后兼容：不传 `onEvent` 时行为与改造前完全一致
