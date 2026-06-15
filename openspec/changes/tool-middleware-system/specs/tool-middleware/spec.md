## ADDED Requirements

### 需求：ToolMetadata 类型扩展

系统 SHALL 在 `types/llm/tool.ts` 中定义 `ToolMetadata` 接口，包含以下字段：`category`（可选，枚举值 "file" | "network" | "compute" | "system" | "browser" | "mcp"，仅用于描述，不用于推断中间件行为）、`retryable`（可选，boolean，默认 true）、`maxRetries`（可选，number，默认 0）、`retryBaseDelay`（可选，number，单位 ms，默认 1000）、`timeoutMs`（可选，number，单位 ms，默认 30000）、`requiredPermissions`（可选，string[]）、`cacheable`（可选，boolean，默认 false）、`cacheKeyFn`（可选，function）、`dangerous`（可选，boolean，默认 false）。`ToolEntry` 类型 SHALL 包含可选的 `metadata` 字段，类型为 `ToolMetadata`。

#### 场景：注册带完整元数据的工具

- **WHEN** 一个工具以 `metadata: { category: "file", retryable: false, timeoutMs: 10000 }` 注册
- **THEN** ToolHandler SHALL 将元数据与工具定义和执行器一起存储

#### 场景：注册不带元数据的工具

- **WHEN** 一个工具注册时未提供 metadata 字段
- **THEN** ToolHandler SHALL 使用默认元数据：`retryable: true`、`maxRetries: 0`、`timeoutMs: 30000`、`cacheable: false`、`dangerous: false`

#### 场景：category 不用于推断中间件行为

- **WHEN** 一个工具的 `category: "file"` 但 `retryable: true`
- **THEN** 重试中间件 SHALL 允许重试，忽略 category

### 需求：异步 ToolExecutor

系统 SHALL 将 `ToolExecutor` 改为异步函数，签名为 `(params: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolResult>`。`ToolExecutionContext` SHALL 包含 `abortSignal?: AbortSignal`。`ToolResult` SHALL 包含 `content: string`、`metadata?: Record<string, unknown>` 和 `error?: { code: string, message: string }`。同步工具 SHALL 用 `Promise.resolve()` 包装返回值。不保留同步执行器签名。

#### 场景：异步执行器调用

- **WHEN** 工具执行器通过 `toolHandler.call()` 被调用
- **THEN** 执行器 SHALL 被 await 并返回 `Promise<ToolResult>`

#### 场景：同步工具适配为异步

- **WHEN** 之前的同步工具执行器返回普通字符串
- **THEN** SHALL 将结果包装为 `{ content: result }` 并返回 `Promise.resolve({ content: result })`

### 需求：带运行时状态的 MiddlewareContext

`MiddlewareContext` SHALL 包含 `runtime` 字段，类型为 `MiddlewareRuntimeState`，包含 `startedAt`（可选 number，自 epoch 以来的毫秒数）、`retryCount`（可选 number）、`cacheHit`（可选 boolean）、`timeoutTriggered`（可选 boolean）。每个中间件 SHALL 只写入自己拥有的字段，只读取其他字段。`call()` 入口 SHALL 在调用中间件链之前初始化 `runtime.startedAt`。

#### 场景：调用时初始化运行时状态

- **WHEN** 调用 `toolHandler.call()`
- **THEN** `context.runtime.startedAt` SHALL 在任何中间件运行前设置为当前时间戳

#### 场景：重试中间件写入 retryCount

- **WHEN** 重试中间件执行了 2 次重试
- **THEN** SHALL 设置 `context.runtime.retryCount = 2`，日志/指标中间件 SHALL 读取此值

#### 场景：缓存中间件写入 cacheHit

- **WHEN** 缓存中间件返回缓存结果
- **THEN** SHALL 设置 `context.runtime.cacheHit = true`，指标中间件 SHALL 读取此值以递增 cacheHits

#### 场景：超时中间件写入 timeoutTriggered

- **WHEN** 超时中间件因超时中止执行
- **THEN** SHALL 设置 `context.runtime.timeoutTriggered = true`，指标中间件 SHALL 读取此值以递增 timeoutCount

### 需求：中间件链架构

系统 SHALL 实现基于洋葱模型的异步中间件链。每个中间件 SHALL 接收 `MiddlewareContext`（包含 toolName、params、metadata、sessionId、abortSignal、runtime）和返回 `Promise<ToolResult>` 的 `next` 函数，并 SHALL 返回 `Promise<ToolResult>`。`toolHandler.call()` 方法 SHALL 在调用实际执行器之前，组装并执行中间件链。

#### 场景：中间件链执行顺序

- **WHEN** 中间件 A、B、C 按此顺序注册，且一个工具被调用
- **THEN** 执行顺序 SHALL 为：A before → B before → C before → executor → C after → B after → A after

#### 场景：中间件拒绝时短路

- **WHEN** 中间件 A 返回带 error 的 ToolResult 且未调用 `next()`
- **THEN** 后续中间件和执行器 SHALL 不执行，并返回错误的 ToolResult

### 需求：重试中间件

系统 SHALL 实现重试中间件，根据工具的元数据对失败的工具执行进行重试。中间件 SHALL 遵循 `metadata.retryable`（默认 true）、`metadata.maxRetries`（默认 0）和 `metadata.retryBaseDelay`（默认 1000ms）。重试延迟 SHALL 遵循指数退避：`baseDelay * 2^attempt`。中间件 SHALL 不从 `category` 推断可重试性。每次重试时，中间件 SHALL 将当前尝试次数写入 `context.runtime.retryCount`。

#### 场景：可重试工具在瞬时故障后成功

- **WHEN** 一个 `retryable: true` 且 `maxRetries: 2` 的工具在第一次尝试失败但第二次成功
- **THEN** 中间件 SHALL 返回成功的 ToolResult，`context.runtime.retryCount = 1`

#### 场景：不可重试工具立即失败

- **WHEN** 一个 `retryable: false` 的工具执行失败
- **THEN** 中间件 SHALL 立即返回失败结果，不进行重试，`context.runtime.retryCount = 0`

#### 场景：重试次数耗尽

- **WHEN** 一个 `maxRetries: 2` 的工具在全部 3 次尝试（1 次原始 + 2 次重试）中均失败
- **THEN** 中间件 SHALL 返回最后一次失败的 ToolResult，`context.runtime.retryCount = 2`

### 需求：超时中间件

系统 SHALL 实现超时中间件，根据 `metadata.timeoutMs`（默认 30000ms）强制执行最大执行时长。中间件 SHALL 使用 `Promise.race` 配合定时器和 `AbortController` 在超时时真正中止执行。中间件 SHALL 创建子 AbortController，并使用 `anySignal()` 将父信号（`context.abortSignal`）与超时信号合并，将合并后的信号传递给下游中间件和执行器。超时时，中间件 SHALL 设置 `context.runtime.timeoutTriggered = true` 并返回 `error: { code: "TIMEOUT", message: "Execution exceeded <timeoutMs>ms" }` 的 ToolResult。每次重试（由重试中间件调用）时，SHALL 创建新的 AbortController。

#### 场景：执行在超时时间内完成

- **WHEN** 工具执行在 500ms 内完成，`timeoutMs: 1000`
- **THEN** 中间件 SHALL 返回正常 ToolResult，`context.runtime.timeoutTriggered` SHALL 保持 `false`

#### 场景：执行超过超时时间

- **WHEN** 工具执行超过 `timeoutMs: 1000`
- **THEN** 中间件 SHALL 通过子 AbortController 中止，设置 `context.runtime.timeoutTriggered = true`，并返回 `{ content: "", error: { code: "TIMEOUT", message: "Execution exceeded 1000ms" } }`

#### 场景：超时信号与父信号合并

- **WHEN** 超时中间件创建子 AbortController
- **THEN** 合并信号 SHALL 在父 `context.abortSignal` 或超时信号任一触发时中止，合并信号 SHALL 作为新的 `abortSignal` 传递给 `next()`

#### 场景：超时中止副作用执行

- **WHEN** 超时在执行期间触发
- **THEN** 合并的 AbortSignal SHALL 被设置，但运行时 SHALL 不保证底层副作用（fs.writeFile、browser.click 等）已停止——仅保证运行时停止等待结果

#### 场景：每次重试创建新的 AbortController

- **WHEN** 重试中间件为重试调用超时中间件的 `next()`
- **THEN** 超时中间件 SHALL 为该次尝试创建新的 AbortController

### 需求：日志中间件

系统 SHALL 实现日志中间件，使用项目的 `logger()` 函数记录工具调用的开始和结束。开始日志 SHALL 包含时间戳、工具名称和参数。结束日志 SHALL 包含时间戳、工具名称、耗时、成功/错误状态和结果摘要（截断至 200 字符）。日志中间件 SHALL 记录完整的工具调用生命周期（包括重试），而非单次重试尝试。SHALL 读取 `context.runtime.retryCount`、`context.runtime.cacheHit` 和 `context.runtime.timeoutTriggered` 并包含在日志中。

#### 场景：成功工具调用的日志

- **WHEN** 工具调用开始并成功完成
- **THEN** 日志中间件 SHALL 打印包含工具名称和参数的开始日志，以及包含耗时和成功状态的结束日志

#### 场景：失败工具调用的日志

- **WHEN** 工具调用失败
- **THEN** 日志中间件 SHALL 打印开始日志和包含错误信息的结束日志

#### 场景：重试工具调用记为单次调用

- **WHEN** 工具调用在 2 次重试后成功
- **THEN** 日志中间件 SHALL 记录一条完整调用条目，包含从 `context.runtime.retryCount` 读取的 `retries: 2`，而非 3 条独立条目

#### 场景：缓存命中工具调用的日志

- **WHEN** 工具调用结果为缓存命中
- **THEN** 日志中间件 SHALL 记录该调用，包含从 `context.runtime.cacheHit` 读取的 `cached: true`

### 需求：权限中间件

系统 SHALL 实现权限中间件，在执行工具前检查 `metadata.requiredPermissions` 是否在提供的权限集合中。如果缺少任何必需权限，中间件 SHALL 返回带 error 的 ToolResult 且不调用 `next()`。

#### 场景：所有权限已授予

- **WHEN** 工具要求 `["fs.read", "fs.write"]`，且权限集合包含两者
- **THEN** 中间件 SHALL 调用 `next()` 并继续执行

#### 场景：缺少权限

- **WHEN** 工具要求 `["fs.write"]`，且权限集合不包含 `fs.write`
- **THEN** 中间件 SHALL 返回 `{ content: "", error: { code: "PERMISSION_DENIED", message: "Permission denied: fs.write" } }`，不执行工具

#### 场景：工具无必需权限

- **WHEN** 工具的 `requiredPermissions: undefined` 或为空数组
- **THEN** 中间件 SHALL 跳过权限检查并继续执行

### 需求：取消中间件

系统 SHALL 实现取消中间件，在执行前检查 `MiddlewareContext` 中的 `AbortSignal`。如果信号已中止，中间件 SHALL 返回已取消的结果。执行期间，中间件 SHALL 将 `AbortSignal` 传递给下游（由超时中间件合并）并最终传递到执行器的 `ToolExecutionContext` 以实现协作式取消。

#### 场景：执行前已取消

- **WHEN** 中间件运行时 AbortSignal 已经中止
- **THEN** 中间件 SHALL 返回 `{ content: "", error: { code: "CANCELLED", message: "Tool call cancelled" } }`，不执行工具

#### 场景：信号传递给下游

- **WHEN** AbortSignal 在中间件入口时未中止
- **THEN** 中间件 SHALL 将信号传递给下游，由超时中间件将其与超时信号合并

#### 场景：执行期间信号中止

- **WHEN** AbortSignal 在执行器执行期间变为中止状态
- **THEN** 执行器 MAY 协作式检查信号并停止；运行时 SHALL 不保证底层副作用已停止

### 需求：缓存中间件

系统 SHALL 实现缓存中间件，当 `metadata.cacheable` 为 true（默认 false）时缓存工具执行结果。缓存键 SHALL 由 `metadata.cacheKeyFn` 生成（如果提供），否则使用 `${toolName}:${stableStringify(params)}`，其中 `stableStringify` 在序列化前对对象键排序。缓存 SHALL 作用于当前会话生命周期（内存 Map）。缓存命中 SHALL 仍经过指标中间件（缓存位于执行顺序中指标的内层）。缓存命中时，中间件 SHALL 设置 `context.runtime.cacheHit = true`。

#### 场景：缓存命中

- **WHEN** 一个可缓存工具以与之前成功调用相同的参数被调用
- **THEN** 中间件 SHALL 返回缓存的 ToolResult 且不调用 `next()`，设置 `context.runtime.cacheHit = true`

#### 场景：缓存未命中

- **WHEN** 一个可缓存工具首次被调用或使用不同参数
- **THEN** 中间件 SHALL 执行工具并将结果存入缓存，`context.runtime.cacheHit` 保持未设置或 `false`

#### 场景：不可缓存工具

- **WHEN** 一个 `cacheable: false`（默认）的工具被调用
- **THEN** 中间件 SHALL 始终执行工具并跳过缓存

#### 场景：失败结果不缓存

- **WHEN** 一个可缓存工具执行失败
- **THEN** 中间件 SHALL 不缓存失败结果

#### 场景：缓存命中计入指标

- **WHEN** 可缓存工具调用结果为缓存命中
- **THEN** 指标中间件（外层）SHALL 仍记录该调用并递增 `cacheHits`

#### 场景：键顺序无关的稳定缓存键

- **WHEN** 可缓存工具先以 `{ a: 1, b: 2 }` 调用，后以 `{ b: 2, a: 1 }` 调用
- **THEN** 缓存键 SHALL 相同，第二次调用 SHALL 命中缓存

### 需求：指标中间件

系统 SHALL 实现指标中间件，记录每个工具的指标：调用次数、错误次数、总耗时、平均耗时、最后调用时间戳、缓存命中次数、缓存未命中次数、超时次数和重试次数。指标 SHALL 在内存中聚合，并在每次工具调用后持久化到会话根目录的 `metrics.json` 文件中。中间件 SHALL 跟踪完整的工具执行生命周期（包括缓存命中和重试），而非仅单次执行器运行。中间件 SHALL 读取 `context.runtime.cacheHit`、`context.runtime.retryCount` 和 `context.runtime.timeoutTriggered` 来填充缓存/超时/重试指标。

#### 场景：成功调用的指标

- **WHEN** 工具调用在 150ms 内成功
- **THEN** 中间件 SHALL 将 callCount 加 1，将 150ms 加到 totalDurationMs，并更新 avgDurationMs 和 lastCalledAt

#### 场景：失败调用的指标

- **WHEN** 工具调用在 50ms 内失败
- **THEN** 中间件 SHALL 将 callCount 加 1、errorCount 加 1，将 50ms 加到 totalDurationMs

#### 场景：缓存命中指标

- **WHEN** 工具调用结果为缓存命中（`context.runtime.cacheHit === true`）
- **THEN** 中间件 SHALL 将 cacheHits 加 1，callCount 加 1

#### 场景：缓存未命中指标

- **WHEN** 可缓存工具调用结果为缓存未命中（`context.runtime.cacheHit !== true` 且 `metadata.cacheable === true`）
- **THEN** 中间件 SHALL 将 cacheMisses 加 1

#### 场景：超时指标

- **WHEN** 工具调用超时（`context.runtime.timeoutTriggered === true`）
- **THEN** 中间件 SHALL 将 timeoutCount 加 1

#### 场景：重试指标

- **WHEN** 工具调用涉及重试（`context.runtime.retryCount > 0`）
- **THEN** 中间件 SHALL 将 retryCount 增加 `context.runtime.retryCount`

#### 场景：指标持久化

- **WHEN** 任意工具调用完成
- **THEN** 指标中间件 SHALL 将更新后的 `SessionMetrics` 写入会话根目录的 `metrics.json`

### 需求：ToolHandler 工厂函数

`ToolHandler` 类 SHALL 被替换为工厂函数 `createToolHandler(middlewares?)`，遵循项目的函数+闭包约定。返回的对象 SHALL 暴露 `register()`、`getToolDefinitions()`、`get()`、`set()`、`call()`、`has()` 方法。`call()` 方法 SHALL 返回 `Promise<ToolResult>`，初始化 `MiddlewareRuntimeState.startedAt`，并组装和执行中间件链。

#### 场景：使用默认中间件的 ToolHandler

- **WHEN** 调用 `createToolHandler()` 时不传参数
- **THEN** SHALL 创建带有默认中间件链（permission → cancellation → cache → metrics → logging → retry → timeout）的处理器

#### 场景：使用自定义中间件的 ToolHandler

- **WHEN** 调用 `createToolHandler([customMiddleware])`
- **THEN** SHALL 创建仅使用所提供中间件的处理器

#### 场景：调用时初始化运行时状态

- **WHEN** 调用 `toolHandler.call("weather.getWeather", params, "session-123")`
- **THEN** `context.runtime.startedAt` SHALL 在第一个中间件运行前设置

### 需求：中间件上下文包含会话 ID

`MiddlewareContext` SHALL 包含 `sessionId` 字段。`toolHandler.call()` 方法 SHALL 接受可选的 `sessionId` 参数来填充此字段。

#### 场景：带会话 ID 的调用

- **WHEN** 调用 `toolHandler.call("weather.getWeather", params, "session-123")`
- **THEN** MiddlewareContext SHALL 包含 `sessionId: "session-123"`

#### 场景：不带会话 ID 的调用

- **WHEN** 调用 `toolHandler.call("weather.getWeather", params)`
- **THEN** MiddlewareContext SHALL 包含 `sessionId: ""`
