## Why

ReAct 循环当前使用 `provider.chat()` 非流式调用，用户必须等待整个 LLM 响应生成完毕才能看到任何输出。在多轮工具调用场景下（ReAct 的典型场景），每轮迭代都是"黑盒等待"，体验明显差于已支持流式的普通工作流。将流式输出适配到 ReAct 循环，可以让文字逐 token 呈现、工具调用状态实时反馈，显著改善交互体验。

## What Changes

- 扩展 **ReAct 循环**：Act 阶段从 `provider.chat()` 切换到 `provider.chatStream()`，支持流式接收 LLM 响应
- 新增 **ReAct 事件协议**：在 `RuntimeEvent` 基础上，增加 ReAct 循环层级的事件（迭代开始/结束、阶段转换、工具执行状态），让消费者能感知完整的 ReAct 执行过程
- 新增 **ReAct 流式回调接口**：通过事件回调（event emitter 或 callback）将流式事件传递给调用方，保持 loop 函数的纯状态机特性（不直接 I/O）
- 扩展 **调用方集成**：`index.ts` 中 `sendMessageReAct()` 消费 ReAct 流式事件，实现终端逐 token 输出和工具状态显示

## Capabilities

### New Capabilities
- `react-streaming`: ReAct 循环流式输出能力，定义 ReAct 层级事件协议和流式 Act 阶段执行

### Modified Capabilities
- `react-loop`: Act 阶段改用流式调用，循环执行结果扩展为流式事件序列

## Impact

- **ReAct 循环**：`react/loop.ts` 的 `executeActPhase()` 需改用 `provider.chatStream()`，整个循环需增加事件回调机制
- **事件类型**：需扩展 `RuntimeEvent` 或定义 ReAct 专属事件类型
- **状态管理**：`react/state.ts` 无需改动，流式合并逻辑在 loop 层使用已有的 `createStreamMerger()`
- **入口**：`index.ts` 的 `sendMessageReAct()` 需消费流式事件并实时输出
- **类型**：可能需要新增 ReAct 循环配置项（回调函数类型）
