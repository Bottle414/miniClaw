## Context

miniClaw 当前采用同步请求-响应模式：`Provider.chat()` 返回 `Promise<LLMResponse>`，`LLMAdapter` 只提供 `transformRequest/transformResponse` 两个转换方法。DeepSeek API 已支持 `stream: true`，但项目中没有流式类型定义、流式适配方法或流式 Provider 方法。

当前数据流：
```
LLMRequest → adaptor.transformRequest() → DeepSeek API → full response → adaptor.transformResponse() → LLMResponse
```

目标数据流：
```
LLMRequest → adaptor.transformRequest() → DeepSeek API (stream)
  → SSE chunks → adaptor.transformStreamChunk() → RuntimeEvent
  → mergeStreamMessage() → 完整 LLMAssistantMessage (用于工具调用)
```

关键约束（来自项目规范）：
- 必须使用统一 `LLM*` 类型，禁止直接使用 provider 原始类型
- 工具名 `.` ↔ `-` 转换封装在 adaptor 内
- 函数优先于类
- ESM only，TypeScript strict mode

## Goals / Non-Goals

**Goals:**
- 定义统一的 Runtime Event 类型体系，作为流式输出的标准协议
- 实现 DeepSeek 流式 chunk 到 Runtime Event 的转换
- 实现流式消息合并，确保 tool_call 完整组装后才触发工具执行
- 扩展 Provider 接口支持流式聊天
- 保持与非流式模式的完全兼容

**Non-Goals:**
- 不改造 ReAct 循环的流式支持（后续迭代）
- 不实现前端 UI 的流式渲染
- 不支持多 provider 流式（仅 DeepSeek）
- 不实现流式错误重试机制

## Decisions

### Decision 1: Runtime Event 类型设计

**选择**：定义 `RuntimeEvent` discriminated union，使用 `type` 字段区分事件类型。

```typescript
type RuntimeEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; argumentsDelta: string }
  | { type: 'tool-call-end'; toolCallId: string; arguments: string }
  | { type: 'tool-result'; toolCallId: string; result: string; success: boolean }
  | { type: 'finish'; reason: LLMFinishReason; usage?: LLMUsage }
  | { type: 'error'; error: Error }
```

**替代方案**：
1. **仅 text-delta + finish**：最简方案，但无法区分工具调用的开始/进行/结束，前端无法展示工具调用状态
2. **Vercel AI SDK 风格**（`StreamPart`）：更复杂，引入 `tool-call-streaming-start` 等冗长命名，且与项目现有命名风格不一致

**理由**：`tool-call-start/delta/end` 三段式设计让消费者可以：
- 在 `start` 时展示"正在调用工具 X"
- 在 `delta` 时展示参数流（可选）
- 在 `end` 时拿到完整参数，触发工具执行
- `tool-result` 由 runtime 执行工具后发出，非 LLM 直接产出

### Decision 2: 流式消息合并策略

**选择**：`mergeStreamMessage()` 函数，接收 `RuntimeEvent[]`，返回 `LLMAssistantMessage | null`。

- 累积 `text-delta` → 拼接为 `content`
- 累积 `tool-call-start/delta/end` → 组装为完整 `LLMToolCall[]`
- 在收到 `finish` 事件时返回最终消息
- 中间状态返回 `null`（尚未完成）

**替代方案**：
1. **增量式 merge**（每次返回部分消息）：增加复杂度，消费者需要处理中间状态
2. **类式 StreamAccumulator**：违反项目"函数优先于类"规范

**理由**：函数式设计符合项目规范；只在 `finish` 时返回完整消息，确保 tool_call 参数完整，避免执行不完整的工具调用。

### Decision 3: Provider 流式接口

**选择**：在 `Provider` 接口添加 `chatStream(req: LLMRequest): AsyncIterable<RuntimeEvent>`，与 `chat()` 并存。

**替代方案**：
1. **统一 chat() 返回 AsyncIterable**：**BREAKING**，破坏现有所有调用方
2. **独立 StreamProvider 接口**：过度设计，增加类型复杂度

**理由**：并存方式零破坏性，调用方按需选择。`AsyncIterable<RuntimeEvent>` 是标准异步迭代协议，消费端用 `for await...of` 即可。

### Decision 4: 流式适配器方法

**选择**：在 `LLMAdapter` 接口添加可选 `transformStreamChunk(chunk: unknown): RuntimeEvent | null`。

- 返回 `null` 表示跳过无意义的 chunk（如 DeepSeek 的 `role: "assistant"` 首帧）
- 不在 adaptor 层做累积，累积由 `mergeStreamMessage` 负责

**理由**：adaptor 只做单 chunk 转换，职责单一；累积逻辑独立，可复用。

## Risks / Trade-offs

- **[DeepSeek chunk 顺序依赖]** → tool_call 的 `index` 字段用于匹配同一工具调用的多个 chunk，`transformStreamChunk` 必须正确处理 index 映射
- **[流式中断]** → 如果流中途断开，`mergeStreamMessage` 可能返回 `null`（未收到 `finish`），调用方需处理此情况
- **[Provider 接口扩展]** → 添加 `chatStream` 是非破坏性扩展，但现有 Provider 实现需补充该方法
