## Why

Tool Runtime 的 middleware 链存在三个设计缺陷：Permission middleware 仅实现了基于 `Set<string>` 的简单权限检查，缺乏用户级配置（allow/check/deny）、通配符匹配和确认回调机制；Cache middleware 命中时短路跳过 `next()`，导致 Metrics middleware 无法记录缓存命中数据；Metrics middleware 直接承担文件持久化职责，使 Runtime 与具体存储实现耦合，违反关注点分离原则。

## What Changes

- **重新实现 Permission middleware**：基于 `permission.json` 配置文件，支持 `allow`/`check`/`deny` 三级权限控制，支持工具名通配符匹配（如 `weather.*`），`deny > check > allow` 优先级，`check` 类型工具执行前通过回调向调用方请求确认
- **新增 `permission.json` 配置**：用户级（非 session 级）权限配置文件，放置于项目根目录
- **修正 Cache 命中时的 Metrics 记录**：Cache 命中后仍调用 `next()`，使 Metrics middleware 可观测缓存命中事件，或调整 middleware 链顺序使 Metrics 在 Cache 之前执行
- **移除 Metrics 持久化逻辑**：Metrics middleware 仅负责运行时聚合，不再写入 `metrics.json`
- **RuntimeConfig 增加 `onMetricsUpdate` 回调**：每次指标变化后向调用方发送最新 `MetricsSnapshot`，持久化由调用方自行实现

## Capabilities

### New Capabilities
- `permission-system`：基于配置文件的权限控制系统，支持 allow/check/deny 三级权限、通配符匹配、确认回调

### Modified Capabilities
- `cache-metrics`：修正缓存命中时的指标记录，确保 Metrics middleware 可观测缓存命中事件
- `metrics-observer`：Metrics middleware 从"聚合+持久化"改为"聚合+通知"，通过回调向调用方推送指标快照

## Impact

- **代码**：`apps/runtime/src/tools/middlewares/permission.ts`（重写）、`cache.ts`（调整链路）、`metrics.ts`（移除持久化、增加回调）
- **类型**：`types/llm/tool.ts` 中 `ToolMetadata`、`MiddlewareRuntimeState` 等类型可能扩展
- **配置**：`types/config/index.ts` 中 `RuntimeConfig` 增加 `onMetricsUpdate` 回调
- **新增文件**：项目根目录 `permission.json`（权限配置模板）
- **破坏性变更**：**BREAKING** — Metrics 持久化接口移除，调用方需自行处理；Permission middleware 接口变更
