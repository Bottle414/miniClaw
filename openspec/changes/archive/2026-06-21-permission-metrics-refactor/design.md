## Context

miniClaw Tool Runtime 采用洋葱模型 middleware 链组织横切逻辑，当前链顺序为 `permission → cancellation → cache → metrics → logging → retry → timeout`。三个核心问题：

1. **Permission middleware** 仅实现基于 `Set<string>` 的简单权限检查（`permission.ts:7-26`），缺乏用户级配置、通配符匹配和确认回调
2. **Cache 命中短路**：`cache.ts:22-24` 命中后直接 `return cached` 不调用 `next()`，导致下游 metrics/logging/retry/timeout 全部跳过，`runtime.cacheHit = true` 虽已设置但 metrics middleware 永远读不到
3. **Metrics 持久化耦合**：`metrics.ts:14-24` 直接 `fs.writeFile` 写入 `metrics.json`，Runtime 与文件系统存储实现耦合

## Goals / Non-Goals

**Goals:**
- 建立完整的 Permission System：基于 `permission.json` 配置，支持 allow/check/deny 三级权限、通配符匹配、确认回调
- 修正 Cache 命中时 Metrics 数据丢失问题
- 将 Metrics 持久化职责从 Runtime 移除，通过回调机制向调用方推送指标快照
- 保持 middleware 链的洋葱模型架构不变

**Non-Goals:**
- 不实现权限配置的热重载（permission.json 修改后需重启生效）
- 不实现权限的 session 级覆盖（仅用户级配置）
- 不改变 ToolMetadata 的 `requiredPermissions` 字段语义（仍为工具声明所需权限点）
- 不重构 logging/retry/timeout 等 middleware
- 不实现 Metrics 的历史数据查询 API

## Decisions

### D1: Permission 配置格式与匹配策略

**选择**：`permission.json` 使用 `{ allow: string[], check: string[], deny: string[] }` 格式，工具名支持 `*` 通配符（如 `weather.*` 匹配 `weather.getWeather`），匹配逻辑将 `*` 转为正则 `[^.]+` 进行层级匹配。

**理由**：`*` 通配符语义清晰，`weather.*` 表示 weather 命名空间下所有工具，符合直觉。使用 `[^.]+` 而非 `.*` 避免跨命名空间误匹配（`weather.*` 不应匹配 `weather.forecast.daily`）。

**替代方案**：
- glob 模式（`**` 递归匹配）：增加复杂度，当前工具层级不超过 2 级，无必要
- 正则表达式：对用户不友好，配置易出错

### D2: Permission 优先级与 check 回调

**选择**：优先级 `deny > check > allow`。工具名依次检查 deny → check → allow 列表，首个匹配决定结果。`check` 匹配时调用 `onPermissionCheck(toolName): Promise<boolean>` 回调，用户确认返回 true 则放行，false 则拒绝。

**理由**：deny 最高优先级确保安全策略不可被覆盖；check 作为中间态允许运行时决策；allow 为默认放行。回调机制使 Runtime 不依赖具体 UI 实现（TUI/Web/Server 各自实现确认逻辑）。

### D3: Cache 命中时 Metrics 记录方案

**选择**：调整 middleware 链顺序为 `permission → cancellation → metrics → cache → logging → retry → timeout`，将 metrics 移到 cache 之前。

**理由**：
- metrics 在 cache 之前，无论 cache 是否命中，metrics 都能执行并记录
- cache 命中时 metrics 仍调用 `next()`，cache 返回缓存结果后 metrics 可读取 `runtime.cacheHit` 标记
- 不需要修改 cache middleware 的短路逻辑，保持其简洁性
- logging/retry/timeout 在 cache 之后，缓存命中时跳过这些是合理的（无需重试/超时/记录执行日志）

**替代方案**：
- Cache 命中后仍调用 `next()`：破坏洋葱模型语义，cache 内层的 logging/retry/timeout 对缓存结果无意义
- 在 cache middleware 内直接更新 metrics：引入 middleware 间耦合，违反单一职责

### D4: Metrics 回调机制

**选择**：`createMetricsMiddleware` 接收 `onMetricsUpdate: (snapshot: MetricsSnapshot) => void` 回调，每次工具调用完成后（含缓存命中）调用回调推送最新快照。`MetricsSnapshot` 类型为 `{ tools: Record<string, ToolMetrics> }`（复用 `SessionMetrics` 的结构）。

**理由**：回调模式简单直接，调用方在回调中自行决定持久化策略（写文件、上报监控、存数据库等）。每次调用后推送保证数据实时性。

**替代方案**：
- 事件发射器（EventEmitter）：过度设计，当前只有一种事件
- 轮询式 `getMetrics()`：调用方需主动拉取，实时性差

### D5: RuntimeConfig 扩展方式

**选择**：在 `RuntimeConfig` 中增加 `onMetricsUpdate?: (snapshot: MetricsSnapshot) => void`，在 `createToolHandler` 签名中增加 `onMetricsUpdate` 参数，由 `createRuntime` 从 `RuntimeConfig` 透传。

**理由**：保持 `createToolHandler` 的独立性（不依赖 RuntimeConfig 类型），同时 `createRuntime` 作为组装层负责参数传递。

## Risks / Trade-offs

- **[Permission 通配符性能]** → 每次工具调用需遍历 deny/check/allow 列表做正则匹配。缓解：工具数量有限（通常 < 20），性能影响可忽略；可预编译正则缓存
- **[check 回调阻塞]** → `onPermissionCheck` 为异步回调，若调用方实现不当可能阻塞工具执行。缓解：文档说明回调应快速返回，超时由调用方自行处理
- **[Metrics 回调频率]** → 每次工具调用后触发回调，高频调用场景可能产生性能开销。缓解：调用方可节流处理；当前场景调用频率低
- **[链顺序变更影响]** → metrics 移到 cache 之前，metrics 记录的 `durationMs` 将不包含 cache 查找时间。缓解：cache 查找为内存 Map 操作（微秒级），影响可忽略
