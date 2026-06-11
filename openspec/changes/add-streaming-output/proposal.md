## Why

miniClaw 当前只支持非流式请求-响应模式（`Provider.chat()` 返回 `Promise<LLMResponse>`），用户必须等待完整响应生成后才能看到任何输出。对于长文本生成和多轮工具调用场景，这导致体验差、感知延迟高。流式输出可以让文字内容逐 token 呈现，工具调用在完整组装后触发，显著改善交互体验。

## What Changes

- 新增 **Runtime Event** 类型体系：定义统一的流式事件类型（`text-delta`、`tool-call-start`、`tool-call-delta`、`tool-call-end`、`tool-result`、`finish` 等），作为 runtime 对外输出的标准协议
- 新增 **DeepSeek 流式适配**：在 `deepseek` adaptor 中添加 `transformStreamChunk()` 函数，将 DeepSeek SSE chunk 转换为 Runtime Event
- 新增 **流式消息合并**：在 `message.ts` 中添加 `mergeStreamMessage()` 函数，将多个流式 chunk 合并为完整的 `LLMResponseMessage`，确保 tool_call 完整组装后才触发工具执行
- 扩展 **Provider 接口**：添加 `chatStream()` 方法返回 `AsyncIterable<RuntimeEvent>`，与现有 `chat()` 并存
- 扩展 **LLMAdapter 接口**：添加 `transformStreamChunk()` 可选方法

## Capabilities

### New Capabilities
- `runtime-event`: Runtime Event 类型定义与事件协议，定义流式输出的标准事件类型
- `stream-adapter`: 流式响应适配层，将 provider SSE chunk 转换为 Runtime Event
- `stream-merge`: 流式消息合并，将多个流式 chunk 合并为完整 LLM 消息

### Modified Capabilities
- `llm-types`: 新增流式相关类型（`LLMStreamChunk`、流式请求/响应类型扩展）
- `llm-adapter`: 适配器接口扩展，添加流式转换方法
- `provider-chat`: Provider 接口扩展，添加流式聊天方法

## Impact

- **类型系统**：`types/llm/` 和 `types/providers/` 需新增流式类型
- **适配器**：`adaptor/deepseek/index.ts` 需新增 `transformStreamChunk()`
- **Provider**：`provider/deepseek.ts` 需新增 `chatStream()` 实现
- **消息处理**：`utils/message.ts` 需新增 `mergeStreamMessage()`
- **入口**：`index.ts` 需支持流式调用路径
- **ReAct 循环**：`react/loop.ts` 可选支持流式输出（本次可暂不改造）
