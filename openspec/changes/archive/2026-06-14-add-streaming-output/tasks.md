## 1. 类型定义

- [x] 1.1 在 `types/llm/` 下新增 `stream.ts`，定义 `LLMStreamChunk`、`LLMStreamChoice`、`LLMStreamDelta`、`LLMStreamToolCall` 类型
- [x] 1.2 在 `types/llm/index.ts` 中导出新增流式类型
- [x] 1.3 在 `types/` 下新增 `event/` 目录，创建 `runtime-event.ts`，定义 `RuntimeEvent` discriminated union（`text-delta`、`tool-call-start`、`tool-call-delta`、`tool-call-end`、`tool-result`、`finish`、`error`）
- [x] 1.4 在 `types/event/index.ts` 中导出 RuntimeEvent 类型
- [x] 1.5 在 `types/index.ts` 中导出 event 模块

## 2. 适配器扩展

- [x] 2.1 在 `types/providers/index.ts` 的 `LLMAdapter` 接口中添加可选 `transformStreamChunk(chunk: unknown): RuntimeEvent | null` 方法
- [x] 2.2 在 `types/providers/deepseek.ts` 中新增 DeepSeek 流式 chunk 类型（`DeepSeekStreamChunk`、`DeepSeekStreamChoice`、`DeepSeekStreamDelta` 等）
- [x] 2.3 在 `adaptor/deepseek/index.ts` 中实现 `transformStreamChunk()`，处理 text-delta、tool-call-start/delta/end、finish 事件转换，正确处理 tool_calls index 映射和工具名 `-` → `.` 还原

## 3. 流式消息合并

- [x] 3.1 在 `utils/message.ts` 中实现 `mergeStreamMessage(events: RuntimeEvent[]): LLMAssistantMessage | null`，累积 text-delta 和 tool-call 事件，finish 时返回完整消息
- [x] 3.2 在 `utils/message.ts` 中实现 `createStreamMerger()` 工厂函数，返回 `{ push(event), getMessage() }` 增量合并器

## 4. Provider 流式接口

- [x] 4.1 在 `types/providers/index.ts` 的 `Provider` 接口中添加 `chatStream(req: LLMRequest): AsyncIterable<RuntimeEvent>` 方法
- [x] 4.2 在 `provider/deepseek.ts` 中实现 `chatStream()`，使用 OpenAI 客户端流式 API，逐 chunk 调用 `transformStreamChunk()` 并 yield RuntimeEvent，跳过 null chunk，处理流式错误

## 5. 入口集成

- [x] 5.1 在 `index.ts` 中添加流式调用路径，当 `config.stream` 为 true 时使用 `chatStream()` 替代 `chat()`
- [x] 5.2 在流式路径中使用 `createStreamMerger()` 累积消息，finish 后通过 `messageHandler` 执行工具调用
