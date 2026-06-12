## Context

当前 miniClaw 有两个工作流：
1. **Legacy 普通工作流**：已支持流式输出（`provider.chatStream()` + `RuntimeEvent` + `createStreamMerger()`），在 `sendMessageLegacyStream()` 中逐 token 输出到终端
2. **ReAct 工作流**：使用 `provider.chat()` 非流式调用，`executeActPhase()` 在 `loop.ts:148` 处等待完整响应后才返回

ReAct 循环经重构后是纯状态机（无 I/O），通过 `ReActLoopConfig` 配置、`ReActLoopResult` 返回结果。流式事件需要从 loop 内部传递到外部调用方，但 loop 不应直接做 I/O。

已有的流式基础设施：
- `RuntimeEvent`：7 种事件的 discriminated union（text-delta / tool-call-start / tool-call-delta / tool-call-end / tool-result / finish / error）
- `Provider.chatStream()`：返回 `AsyncIterable<RuntimeEvent>`
- `createStreamMerger()`：累积 RuntimeEvent，`getMessage()` 返回完整 `LLMAssistantMessage`
- `deepseekAdapter.transformStreamChunk()`：SSE chunk → RuntimeEvent 转换

## Goals / Non-Goals

**Goals:**
- ReAct 循环 Act 阶段使用 `provider.chatStream()` 流式调用 LLM
- 定义 ReAct 层级事件协议，让调用方能感知迭代、阶段转换、工具执行等
- 通过回调机制将事件从 loop 传递到调用方，保持 loop 不直接做 I/O
- 复用已有的 `RuntimeEvent`、`createStreamMerger()` 基础设施
- 在终端调用方（`sendMessageReAct`）实现实时逐 token 输出

**Non-Goals:**
- 不改造前端 UI（web app 仍是空壳）
- 不支持多 provider 流式（仅 DeepSeek）
- 不实现流式错误重试
- 不改变 ReAct 循环的状态管理方式（仍为不可变状态）

## Decisions

### Decision 1: ReAct 事件类型设计

**选择**：定义 `ReActEvent` discriminated union，包含两类事件：
1. **透传 RuntimeEvent**：Act 阶段的流式 LLM 事件原样透传（text-delta / tool-call-start / tool-call-delta / tool-call-end / finish / error）
2. **ReAct 循环层级事件**：新增迭代开始、阶段转换、工具执行状态等事件

```typescript
type ReActEvent =
  // 透传 LLM 流式事件
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; argumentsDelta: string }
  | { type: 'tool-call-end'; toolCallId: string; arguments: string }
  | { type: 'finish'; reason: string; usage?: LLMUsage }
  | { type: 'error'; error: Error }
  // ReAct 循环层级事件
  | { type: 'react-iteration-start'; iteration: number }
  | { type: 'react-phase-change'; phase: ReActPhase; iteration: number }
  | { type: 'react-tool-execute'; toolCallId: string; toolName: string }
  | { type: 'react-tool-result'; toolCallId: string; toolName: string; result: string; success: boolean }
  | { type: 'react-loop-end'; reason: string; iterations: number }
```

**替代方案**：
1. **仅透传 RuntimeEvent，不增加 ReAct 事件**：调用方无法感知迭代边界和阶段转换，无法输出"第 N 轮思考"等信息
2. **两层事件流（LLM 事件 + ReAct 事件分别传递）**：增加复杂度，调用方需协调两个流

**理由**：统一事件流简化消费端逻辑。ReAct 层级事件是纯增量，不与 RuntimeEvent 冲突（type 前缀 `react-` 区分）。调用方按 type 分发即可。

### Decision 2: 事件传递机制 — 回调函数

**选择**：在 `ReActLoopConfig` 中添加可选的 `onEvent` 回调：

```typescript
interface ReActLoopConfig {
  provider: Provider
  config: Config
  userInput: string
  initialMessages?: LLMMessage[]
  onEvent?: (event: ReActEvent) => void  // 新增
}
```

**替代方案**：
1. **AsyncIterable 返回**：`executeReActLoop()` 返回 `AsyncIterable<ReActEvent>`，但循环内部有副作用（工具执行、状态更新），不适合作为纯迭代器
2. **EventEmitter**：引入 Node.js EventEmitter 依赖，过度设计
3. **返回 Promise + 事件流**：同时返回结果和事件流，API 复杂

**理由**：回调函数最简单、最符合现有模式。调用方传入 `onEvent` 即可接收事件，不传则行为与当前完全一致（向后兼容）。loop 内部在关键节点调用 `onEvent(event)` 即可。

### Decision 3: Act 阶段流式执行

**选择**：`executeActPhase()` 改用 `provider.chatStream()`，内部使用 `createStreamMerger()` 累积事件，同时通过 `onEvent` 逐事件透传。

```typescript
async function executeActPhase(state, provider, config, onEvent?) {
  const merger = createStreamMerger()
  for await (const event of provider.chatStream(req)) {
    onEvent?.(event)          // 透传给调用方
    merger.push(event)        // 累积到合并器
  }
  const message = merger.getMessage()
  // ... 后续逻辑与当前一致
}
```

**替代方案**：
1. **由调用方控制流**：将 `chatStream()` 迭代器暴露给调用方 — 违反 loop 封装，调用方需理解内部状态
2. **双模式（流式/非流式切换）**：增加分支复杂度，且非流式模式没有实际使用场景

**理由**：loop 内部保持对迭代过程的控制权，调用方只通过事件回调消费。`createStreamMerger()` 已有成熟实现，直接复用。流式是 ReAct 循环唯一合理的模式，不需要非流式回退。

### Decision 4: Observe 阶段事件

**选择**：工具执行时发出 `react-tool-execute` 和 `react-tool-result` 事件。

```typescript
for (const toolCall of toolCalls) {
  onEvent?.({ type: 'react-tool-execute', toolCallId, toolName })
  // 执行工具...
  onEvent?.({ type: 'react-tool-result', toolCallId, toolName, result, success })
}
```

**理由**：让调用方能实时看到"正在执行工具 X"和"工具 X 返回结果"，而非等待所有工具执行完毕。在终端场景下，这比一次性输出所有结果体验更好。

## Risks / Trade-offs

- **[ReActEvent 类型膨胀]** → 7 种 RuntimeEvent + 5 种 ReAct 事件 = 12 种。通过 `react-` 前缀区分，消费端按前缀分发即可，实际复杂度可控
- **[回调函数与错误处理]** → 如果 `onEvent` 回调抛出异常，会中断 loop 执行。应在 loop 内 try-catch 包裹 `onEvent` 调用，异常时记录但不中断
- **[流式中断]** → 如果 `chatStream()` 中途断开，`merger.getMessage()` 返回 null，loop 应将其视为空响应并终止，与当前行为一致
- **[向后兼容]** → `onEvent` 为可选参数，不传则行为完全不变。现有调用方无需修改
