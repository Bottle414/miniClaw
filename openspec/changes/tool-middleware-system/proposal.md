## Why

miniClaw 的工具执行路径缺少统一的错误处理和可观测性机制。目前仅有 ReAct 循环内有基础的 try/catch，legacy 路径无任何错误处理；无重试、超时、权限校验、缓存、取消等能力；工具调用无日志记录和 metrics 采集，无法事后排查问题或评估工具性能。需要在工具执行函数外以中间件形式统一注入这些横切关注点，并根据工具的 capability metadata 差异化中间件行为。

本次改造目标之一，是将当前简单 Tool Call 执行逻辑演进为具备生命周期管理能力的 Tool Runtime。

## What Changes

- 将 executor 改造为异步（`Promise<ToolResult>`），支持 timeout / cancellation / 并行执行等异步语义
- 引入工具中间件（middleware）架构，在 `toolHandler.call()` 外层包裹可组合的异步中间件链
- 为工具类型拓展 `ToolMetadata`，基于 capability（retryable / cacheable / dangerous 等）声明中间件行为差异，而非基于 category 推断
- 实现核心中间件：重试（retry）、超时截断（timeout，使用 Promise.race + AbortController）、工具调用日志（logging）、权限校验（permission）、取消（cancellation，使用 AbortSignal）、缓存（cache）、指标采集（metrics）
- 工具调用执行记录独立存储到 session 下的 `tool-runs.json`，不污染 LLMToolMessage
- Metrics 数据（调用次数、平均耗时、错误率、缓存命中率、超时/重试次数）持久化到 session 根目录
- 日志输出使用项目统一的 `logger()` 函数

## Capabilities

### New Capabilities
- `tool-middleware`: 异步中间件架构与核心中间件实现（retry、timeout、logging、permission、cancellation、cache、metrics），ToolMetadata 类型拓展，executor 异步化
- `tool-observability`: 工具调用执行记录独立存储（tool-runs.json）、metrics 采集（含 cacheHits/cacheMisses/timeoutCount/retryCount）、统一 logger 使用

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- `apps/runtime/src/tools/` — ToolHandler 改造为支持异步中间件链，ToolEntry 增加 metadata 字段，executor 改为 async
- `apps/runtime/src/types/llm/tool.ts` — 新增 ToolResult、ToolExecutionContext、ToolMetadata、ToolMiddleware、ToolExecutionRecord、SessionMetrics 等类型定义
- `apps/runtime/src/utils/logger.ts` — 扩展 infoType 映射支持 "tool" 类别
- `apps/runtime/src/memory/` — session 目录新增 tool-runs.json 和 metrics.json 存储
- `apps/runtime/src/react/loop.ts` — 工具执行路径适配异步中间件
- `apps/runtime/src/utils/tool.ts` — legacy 路径适配异步中间件
- 所有现有工具定义文件 — executor 改为 async，补充 metadata 声明
