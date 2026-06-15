## 1. 类型定义

- [ ] 1.1 在 `types/llm/tool.ts` 中新增 `ToolResult` 接口（content: string, metadata?: Record<string, unknown>, error?: { code: string, message: string }）
- [ ] 1.2 在 `types/llm/tool.ts` 中新增 `ToolExecutionContext` 接口（abortSignal?）
- [ ] 1.3 在 `types/llm/tool.ts` 中将 `ToolExecutor` 改造为异步：`(params, context: ToolExecutionContext) => Promise<ToolResult>`
- [ ] 1.4 在 `types/llm/tool.ts` 中新增 `ToolMetadata` 接口（category 可选仅描述, retryable, maxRetries, retryBaseDelay, timeoutMs, requiredPermissions, cacheable, cacheKeyFn, dangerous）
- [ ] 1.5 在 `types/llm/tool.ts` 中新增 `MiddlewareRuntimeState` 接口（startedAt?, retryCount?, cacheHit?, timeoutTriggered?）
- [ ] 1.6 在 `types/llm/tool.ts` 中新增 `MiddlewareContext` 接口（toolName, params, metadata, sessionId, abortSignal?, runtime: MiddlewareRuntimeState）
- [ ] 1.7 在 `types/llm/tool.ts` 中新增 `ToolMiddleware` 类型别名：`(context, next: () => Promise<ToolResult>) => Promise<ToolResult>`
- [ ] 1.8 在 `types/llm/tool.ts` 中新增 `ToolExecutionRecord` 接口（toolName, startedAt, finishedAt, durationMs, retries, cached, error?）
- [ ] 1.9 在 `types/llm/tool.ts` 中新增 `SessionMetrics`、`ToolMetrics` 接口（含 cacheHits, cacheMisses, timeoutCount, retryCount）

## 2. 工具函数

- [ ] 2.1 在 `utils/` 下实现 `anySignal(signals: (AbortSignal | undefined)[])` — 合并多个 AbortSignal，任一 abort 则合并信号 abort
- [ ] 2.2 在 `utils/` 下实现 `stableStringify(params: Record<string, unknown>)` — sorted key 序列化，保证 cache key deterministic
- [ ] 2.3 在 `utils/logger.ts` 的 infoType 映射中新增 `"tool"` → `"TOOL_LOG_DEBUG"` 条目

## 3. 现有工具异步化改造

- [ ] 3.1 改造 `weather.ts` executor 为 async：接收 `(params, context: ToolExecutionContext)` 参数，返回 `Promise<ToolResult>`
- [ ] 3.2 检查并适配其他现有工具文件，统一改为 async executor

## 4. 中间件实现

- [ ] 4.1 创建 `tools/middlewares/` 目录，实现异步中间件组合函数 `composeMiddlewares(middlewares)` — 洋葱模型链式调用，返回 `Promise<ToolResult>`
- [ ] 4.2 实现 `createPermissionMiddleware(permissions)` — 权限校验中间件，拒绝时返回 `{ content: "", error: { code: "PERMISSION_DENIED", message } }`
- [ ] 4.3 实现 `createCancellationMiddleware()` — 取消检查中间件，执行前检查 AbortSignal，执行中传递 signal 给下游
- [ ] 4.4 实现 `createCacheMiddleware()` — 缓存中间件（session 生命周期内 in-memory Map），cache hit 时设置 `context.runtime.cacheHit = true`，使用 `stableStringify` 生成默认 cache key
- [ ] 4.5 实现 `createMetricsMiddleware(sessionsRoot)` — 指标采集中间件（内存聚合 + 持久化到 session 根目录 metrics.json），从 `context.runtime` 读取 cacheHit/retryCount/timeoutTriggered 记录 cacheHits/cacheMisses/timeoutCount/retryCount
- [ ] 4.6 实现 `createLoggingMiddleware()` — 日志中间件（调用开始/结束打印，记录完整 tool call 生命周期），从 `context.runtime` 读取 retryCount/cacheHit/timeoutTriggered，写入 `tool-runs.json`
- [ ] 4.7 实现 `createRetryMiddleware(defaultMaxRetries?)` — 重试中间件（指数退避），基于 `retryable` metadata 判断，不基于 category，每次重试设置 `context.runtime.retryCount`
- [ ] 4.8 实现 `createTimeoutMiddleware(defaultTimeoutMs?)` — 超时截断中间件，创建 child AbortController，使用 `anySignal` 合并 parent signal 与 timeout signal，传递 merged signal 给下游，超时时设置 `context.runtime.timeoutTriggered = true`

## 5. ToolHandler 改造

- [ ] 5.1 将 `tools/index.ts` 中的 `ToolHandler` 类重构为 `createToolHandler(middlewares?)` 工厂函数
- [ ] 5.2 `ToolEntry` 类型增加可选 `metadata: ToolMetadata` 字段
- [ ] 5.3 `register()` 方法签名扩展，支持传入 metadata 参数
- [ ] 5.4 `call()` 方法签名扩展：返回 `Promise<ToolResult>`，支持可选 `sessionId` 参数
- [ ] 5.5 `call()` 方法内部：初始化 `MiddlewareRuntimeState.startedAt` → 构建 MiddlewareContext → compose 中间件链 → 执行链 → 返回 ToolResult
- [ ] 5.6 更新全局 `toolHandler` 单例，使用 `createToolHandler(defaultMiddlewares)` 创建，注入默认中间件链（permission → cancellation → cache → metrics → logging → retry → timeout）

## 6. 现有工具 metadata 补充

- [ ] 6.1 为 `weather.ts` 工具补充 metadata（category: "network", cacheable: true）
- [ ] 6.2 检查并适配其他现有工具文件，补充 metadata

## 7. 调用路径适配

- [ ] 7.1 修改 `react/loop.ts` 中的 `executeObservePhase`，适配 async `toolHandler.call(name, params, sessionId)`，从 ToolResult 提取 content 用于 LLMToolMessage
- [ ] 7.2 修改 `utils/tool.ts` 中的 `useTool`，适配新的 async `call()` 签名和 ToolResult 返回类型
- [ ] 7.3 修改 `utils/tool-message.ts` 中的 `createToolMessagesFromProviderCalls`，从 ToolResult 提取 content 构造 LLMToolMessage（不附加 telemetry 字段）

## 8. 单元测试

- [ ] 8.1 为 `anySignal` 编写单测（多 signal 合并、任一 abort 触发、undefined signal 处理）
- [ ] 8.2 为 `stableStringify` 编写单测（key order 不影响输出、嵌套对象、数组保持顺序）
- [ ] 8.3 为 `composeMiddlewares` 编写单测（异步链式调用、短路、执行顺序）
- [ ] 8.4 为各中间件编写单测（retry、timeout、logging、permission、cancellation、cache、metrics）
- [ ] 8.5 为 `createToolHandler` 编写单测（带/不带中间件、metadata 默认值、async call、runtime state 初始化）
