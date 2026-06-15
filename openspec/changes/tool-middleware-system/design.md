## Context

当前 miniClaw 的工具执行系统由 `ToolHandler` 类统一管理，提供 `register()` / `call()` 等方法。工具执行路径有两条：legacy 路径（`utils/tool.ts`）无任何错误处理；ReAct 循环路径（`react/loop.ts`）仅有基础 try/catch。两种路径均缺少重试、超时、权限校验、缓存、取消、日志和 metrics 等横切关注点。

现有工具定义为 `{ definition: LLMTool, executor: ToolExecutor }` 结构，executor 为同步函数 `(params: Record<string, unknown>) => string`，无 metadata 描述。不同类型工具的行为差异（如 file 工具写失败不可重试、不同工具需要不同权限）无法表达。

本次改造目标之一，是将当前简单 Tool Call 执行逻辑演进为具备生命周期管理能力的 Tool Runtime。这不仅是"给工具增加几个功能"，而是在构建 runtime-level tool execution subsystem。

项目约束：
- TypeScript strict 模式，禁止 `any`
- 使用函数+闭包代替类
- 日志必须使用 `utils/logger.ts` 的 `logger()` 函数
- ESM 模块规范
- 统一 LLM 类型层，禁止直接使用 openai 包类型

## Goals / Non-Goals

**Goals:**
- 将工具执行系统演进为具备生命周期管理能力的 Tool Runtime
- 将 executor 改造为异步，支持 timeout / cancellation / 并行执行等异步语义
- 在 `toolHandler.call()` 外层引入可组合的中间件链，统一处理横切关注点
- 为工具拓展 `ToolMetadata`，使中间件能根据工具能力元数据差异化执行
- 实现 7 个核心中间件：retry、timeout、logging、permission、cancellation、cache、metrics
- 工具调用执行记录独立存储到 session 下的 `tool-runs.json`，metrics 持久化到 session 根目录
- 所有日志输出走统一的 `logger()` 函数

**Non-Goals:**
- 不实现分布式缓存或跨 session 缓存（缓存仅限当前 session 生命周期内）
- 不实现权限的 UI 交互确认（仅做声明式权限检查，未授权直接拒绝）
- 不实现 token 用量的精确计量（依赖 LLM 返回的 usage 数据，不在工具层计算）
- 不实现 metrics 的聚合查询 API（仅持久化原始数据）
- 不实现 `idempotent` metadata 字段（当前阶段 retry 仅基于 `retryable`；后续基于 idempotency 做更严格控制时再引入）
- 不实现 `ToolContent` 的 multi-part / structured 扩展（当前阶段以 string content 为主，但类型设计预留扩展空间）

## Decisions

### 1. Executor 异步化

**选择**：将 `ToolExecutor` 改造为异步函数，返回 `Promise<ToolResult>`。

```ts
interface ToolExecutionContext {
  abortSignal?: AbortSignal
}

interface ToolResult {
  content: string
  metadata?: Record<string, unknown>
  error?: {
    code: string
    message: string
  }
}

type ToolExecutor = (
  params: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>
```

**替代方案**：
- 保持同步 executor：timeout / cancellation 对同步函数无法真正生效；后续 Browser / MCP / filesystem / network tool 基本都是异步操作；当前工具数量少，改造成本最低。

**理由**：
- Promise 化后天然支持 timeout（Promise.race）、AbortSignal、并行执行、串行调度、future batching
- 同步工具可通过 `return Promise.resolve(result)` 适配
- 当前工具数量较少，改造成本最低，后续再改会影响整个 runtime abstraction

### 2. 中间件模式：洋葱模型（Onion Model）

**选择**：采用异步洋葱模型中间件链，每个中间件包裹下一层，可在执行前后分别处理逻辑。

```ts
type ToolMiddleware = (
  context: MiddlewareContext,
  next: () => Promise<ToolResult>
) => Promise<ToolResult>
```

**替代方案**：
- 线性管道（pipeline）：中间件只能在前置阶段处理，无法在执行后做收尾逻辑（如 metrics 需要在执行前后都介入）。
- 装饰器模式：TypeScript 装饰器需要实验性特性支持，且组合不够灵活。

**理由**：洋葱模型天然支持执行前后逻辑（logging 记录开始/结束时间、metrics 计算耗时、retry 在异常后重试），且中间件可独立组合。

**关键设计**：middleware 直接返回 `Promise<ToolResult>`，不引入 `MiddlewareResult`。ToolResult 独立为业务结果结构，logging / metrics / retry 等中间件自行维护运行时 telemetry 状态。这样 ToolResult 可自然扩展后续的 artifact / structured result / browser snapshot 等类型。

### 3. MiddlewareContext 含 Runtime State

Middleware 不只是函数链，同时也是 execution lifecycle state machine。中间件间的共享运行时状态应显式挂载到 context，而非通过闭包隐式传递。

```ts
interface MiddlewareRuntimeState {
  /** 工具调用开始时间戳（ms since epoch） */
  startedAt?: number
  /** 当前重试次数 */
  retryCount?: number
  /** 是否命中缓存 */
  cacheHit?: boolean
  /** 是否触发超时 */
  timeoutTriggered?: boolean
}

interface MiddlewareContext {
  toolName: string
  params: Record<string, unknown>
  metadata: ToolMetadata
  sessionId: string
  abortSignal?: AbortSignal
  /** 中间件间共享的运行时状态 */
  runtime: MiddlewareRuntimeState
}
```

**理由**：
- retry / cache / timeout 中间件产生的状态（retryCount、cacheHit、timeoutTriggered）需要被外层 logging / metrics 中间件读取
- 显式挂载到 `context.runtime` 比闭包隐式共享更利于 runtime consistency
- `startedAt` 由最外层中间件或 `call()` 入口设置，所有中间件可读取
- 每个中间件只写自己负责的字段，其他字段只读

### 4. ToolMetadata 类型设计

在 `types/llm/tool.ts` 中新增 `ToolMetadata`：

```ts
interface ToolMetadata {
  /** 工具类别，仅用于描述和日志，不作为中间件行为推断依据 */
  category?: "file" | "network" | "compute" | "system" | "browser" | "mcp"
  /** 是否可重试，默认 true */
  retryable?: boolean
  /** 最大重试次数，默认 0 */
  maxRetries?: number
  /** 重试间隔基数（ms），默认 1000，实际间隔 = base * 2^attempt */
  retryBaseDelay?: number
  /** 超时时间（ms），默认 30000 */
  timeoutMs?: number
  /** 所需权限点列表 */
  requiredPermissions?: string[]
  /** 是否可缓存，默认 false */
  cacheable?: boolean
  /** 缓存 key 生成策略，默认基于 toolName + stableStringify(params) */
  cacheKeyFn?: (params: Record<string, unknown>) => string
  /** 是否为危险操作，默认 false */
  dangerous?: boolean
}
```

**理由**：
- `category` 改为可选且仅用于描述/日志，中间件行为基于 `retryable` / `cacheable` / `dangerous` 等 capability metadata 推断，而非基于 category 分支逻辑
- capability 比 category 更稳定：Browser/MCP 等复杂工具很难准确归类，category 容易膨胀；而 `retryable` / `cacheable` / `dangerous` 直接表达中间件所需语义
- 各字段均可选，由中间件提供合理默认值
- `cacheKeyFn` 允许工具自定义缓存粒度（如文件工具可忽略部分参数）

**Retryability vs Idempotency**：
- `retryable` 与 idempotency 是不同概念。某些操作 technically retryable，但 retry 可能产生副作用（如 file append、purchase API、shell.execute）
- 当前阶段仅实现 `retryable`，语义为"runtime 是否允许重试"
- 后续引入 `idempotent?: boolean` 时，retry middleware 可基于 idempotency 做更严格控制（如非幂等操作即使 retryable=true 也不自动重试，需用户确认）
- 当前不在 metadata 中预留 `idempotent` 字段，避免过早引入未实现语义

### 5. ToolResult.content 扩展性

当前阶段 `content` 为 `string`，但需为后续扩展预留空间：

```ts
// 当前实现
interface ToolResult {
  content: string
  metadata?: Record<string, unknown>
  error?: { code: string; message: string }
}

// 后续扩展方向（不在当前实现，仅作设计参考）
type ToolContent =
  | string
  | Array<{ type: string; data: unknown }>

interface ToolResult {
  content: ToolContent  // 当前仅使用 string 分支
  // ...
}
```

**理由**：
- Browser / MCP / artifact / screenshot 等复杂工具无法仅用 string 表达结果
- 当前阶段仍以 string content 为主，不实现 multi-part content
- 但 ToolResult 的类型设计应保证：`content` 字段后续可从 `string` 扩展为 `ToolContent` 联合类型，而 middleware contract 和 ToolExecutionRecord 无需变更
- LLM 侧仍需将 content 序列化为 string 构造 `LLMToolMessage`，此转换逻辑应在 adapter 层而非 middleware 层

### 6. 中间件执行顺序

执行顺序（外→内）：permission → cancellation → cache → metrics → logging → retry → timeout → executor

**理由**：
- **permission** 最外层：未授权直接拒绝，无需执行任何后续逻辑
- **cancellation** 第二层：取消检查应在资源消耗操作之前
- **cache** 第三层：命中缓存时跳过执行逻辑，但仍进入 metrics（cache hit 需计入指标）
- **metrics** 第四层：统计整个 tool execution lifecycle（含 cache hit / retry / timeout），而非仅统计单次 executor
- **logging** 第五层：记录完整 tool call（含重试），而非每次 retry 单独记录
- **retry** 第六层：重试包裹 timeout，每次重试独立计时
- **timeout** 第七层：超时截断单次 attempt

语义层次：
```
一次 tool call
  → metrics 统计整体
  → logging 记录完整调用
  → retry 多次 attempt
    → timeout 作用于每次 attempt
  → executor 执行
```

### 7. Timeout / Cancellation 语义

基于异步 executor，timeout 和 cancellation 具备真正的中断能力。

**Timeout middleware 的 AbortSignal 合并**：

timeout middleware 在 runtime 层构造新的 execution signal，需将 parent signal（来自 cancellation middleware）与 timeout signal 合并后传递给下游：

```ts
// timeout middleware 核心逻辑
const timeoutController = new AbortController()

const mergedSignal = anySignal([
  context.abortSignal,
  timeoutController.signal
])

const timeout = new Promise<ToolResult>((_, reject) =>
  setTimeout(() => {
    timeoutController.abort()
    context.runtime.timeoutTriggered = true
    reject(new ToolTimeoutError(metadata.timeoutMs!))
  }, metadata.timeoutMs)
)

const execution = next({
  ...context,
  abortSignal: mergedSignal
})

return Promise.race([execution, timeout])
```

其中 `anySignal(signals)` 为工具函数，返回一个新 `AbortSignal`：当任一输入 signal 被 abort 时，该 signal 也被 abort。

**关键设计**：
- timeout middleware 创建 child AbortController，将 parent signal 与 timeout signal 合并为 merged signal
- merged signal 继续向下游 middleware / executor 传递
- executor 必须通过 `ToolExecutionContext.abortSignal` 响应 timeout / cancellation
- retry middleware 每次重试需创建新的 timeout context（新的 AbortController）

**Cancellation**：使用 `AbortSignal`
- cancellation middleware 执行前检查信号状态
- 执行中将 `AbortSignal` 传递给下游（最终到达 executor 的 `ToolExecutionContext`）
- executor 自主实现 cooperative cancellation

**关键语义**：`AbortSignal` 不保证底层 side effect 已停止，仅保证 runtime 停止等待结果。例如 `fs.writeFile`、`browser.click`、`shell.execute` 可能已部分执行。

### 8. Cache Key 稳定性

默认缓存 key 生成使用 stable stringify，而非 `JSON.stringify`：

```ts
function stableStringify(params: Record<string, unknown>): string {
  return JSON.stringify(params, Object.keys(params).sort())
}
// 默认 cache key: `${toolName}:${stableStringify(params)}`
```

**理由**：
- `JSON.stringify({ a: 1, b: 2 })` 与 `JSON.stringify({ b: 2, a: 1 })` 产生不同字符串
- object key order 不应影响缓存命中
- cache key 必须 deterministic

### 9. 工具调用记录独立存储

工具调用执行记录独立存储在 session 下的 `tool-runs.json`，不写入 `LLMToolMessage`。

```ts
interface ToolExecutionRecord {
  toolName: string
  startedAt: string    // ISO 8601
  finishedAt: string   // ISO 8601
  durationMs: number
  retries: number
  cached: boolean
  error?: string
}
```

**理由**：
- LLM message 应保持 canonical conversation 语义，不应被 runtime telemetry 污染
- duration / retries / cache hit / telemetry 属于 runtime execution metadata，不应进入 context builder / summary / compression / token calculation 流程
- 独立存储便于后续查询和分析，不影响 LLM 上下文窗口

### 10. Metrics 存储策略

Metrics 数据以 JSON 文件存储在 session 根目录下的 `metrics.json`：

```ts
interface SessionMetrics {
  tools: Record<string, ToolMetrics>
}

interface ToolMetrics {
  callCount: number
  errorCount: number
  totalDurationMs: number
  avgDurationMs: number
  lastCalledAt: string
  cacheHits: number
  cacheMisses: number
  timeoutCount: number
  retryCount: number
}
```

**理由**：
- 独立于 messages 存储，避免 messages 文件膨胀
- 按 tool 名称聚合，读取和更新高效
- `cacheHits` / `cacheMisses` 提供缓存命中率 observability
- `timeoutCount` / `retryCount` 提供重试和超时频次 observability

### 11. 中间件实现方式：函数+闭包

遵循项目约定，使用函数+闭包而非类。每个中间件为一个工厂函数，返回 `ToolMiddleware`：

```ts
function createRetryMiddleware(defaultMaxRetries?: number): ToolMiddleware {
  return async (context, next) => {
    // retry logic
  }
}
```

### 12. ToolHandler 改造

将 `ToolHandler` 类改造为工厂函数 `createToolHandler(middlewares?)`，内部维护中间件链：

```ts
function createToolHandler(middlewares?: ToolMiddleware[]) {
  const tools = new Map<string, ToolEntry>()
  // ...register, call 等方法
  // call 方法中：
  //   1. 构建 MiddlewareContext（含 runtime state 初始化）
  //   2. compose middlewares → invoke chain → return ToolResult
}
```

现有全局单例 `toolHandler` 改为调用 `createToolHandler(defaultMiddlewares)` 创建。

## Risks / Trade-offs

- **AbortSignal 不保证底层 side effect 停止** → `fs.writeFile`、`browser.click`、`shell.execute` 等操作被 abort 后可能已部分执行。缓解：在文档中明确此语义；executor 可自行实现 rollback 或补偿逻辑。
- **缓存一致性** → 进程内内存缓存可能与文件系统状态不一致。缓解：缓存仅限当前 session 生命周期，session 结束即清空；`cacheable` 默认 false。
- **metrics 文件写入频率** → 当前每次 tool call 后立即写 `metrics.json`，小规模可行，但后续 parallel tools / browser loops / MCP spam 可能导致 IO hotspot。缓解：当前阶段采用 immediate persist 简化实现；后续可演进为 batch flush / debounce persist / append-only event log / async metrics aggregation。
- **tool-runs.json 膨胀** → `tool-runs.json` 当前为 append-only，长 session 下可能持续膨胀。缓解：当前仅作为开发阶段 runtime tracing；后续可增加 rotation / truncation / sampling / archive。
- **executor 异步化改造** → 所有现有 executor 需改为 async 函数。缓解：当前工具数量少，改造简单（`async + return Promise.resolve(result)`）。
- **ToolEntry 类型变更** → 新增 metadata 为可选字段，executor 签名变更。现有工具需适配新签名，向后不兼容。

## Future Considerations

当前 Tool Runtime 已开始具备 lifecycle management、cancellation、observability、execution semantics、tracing 等能力。后续设计应优先保证：

- **runtime semantics 稳定**：ToolResult 结构、middleware contract、ToolMetadata capability 语义应在实际使用中验证后再固化，避免过早抽象
- **middleware contract 稳定**：`ToolMiddleware` 签名（context → next → Promise<ToolResult>）和 `MiddlewareRuntimeState` 字段应保持稳定，新增状态通过 `metadata` 扩展而非修改接口
- **ToolResult extensibility**：`content` 从 `string` 扩展为 `ToolContent` 联合类型时，middleware 层和 executor 层的变更应最小化

避免 runtime abstraction density 过快膨胀：
- 不急于增加新的 category 值、manager 层、middleware 种类或 event type
- 不急于引入 `idempotent`、`ToolContent` multi-part 等当前无实际使用场景的抽象
- 每次新增 abstraction 前应先验证：是否有真实工具需要此能力？是否无法用现有机制表达？

后续可能演进的领域（按优先级）：
1. `idempotent` metadata → retry middleware 更严格控制
2. `ToolContent` 联合类型 → 支持 structured output / artifact / binary reference
3. metrics batch flush → 减少 IO hotspot
4. tool-runs rotation → 长 session 膨胀控制
5. `anySignal` 工具函数 → 多 signal 合并的标准实现
