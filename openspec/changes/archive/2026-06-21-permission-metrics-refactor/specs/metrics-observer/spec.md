## MODIFIED Requirements

### Requirement: Metrics middleware responsibility
Metrics middleware SHALL 仅负责运行时指标聚合，不再负责持久化。每次工具调用完成后，SHALL 调用 `onMetricsUpdate` 回调推送最新指标快照。

#### Scenario: Metrics update callback invoked
- **WHEN** 工具调用完成（含缓存命中）
- **THEN** metrics middleware SHALL 调用 `onMetricsUpdate(snapshot)`，snapshot 为当前所有工具的完整指标快照

#### Scenario: No callback provided
- **WHEN** `onMetricsUpdate` 未提供（为 `undefined`）
- **THEN** metrics middleware SHALL 仅聚合指标，不触发回调

### Requirement: Metrics middleware factory signature
`createMetricsMiddleware` SHALL 接受 `onMetricsUpdate?: (snapshot: MetricsSnapshot) => void` 参数，不再接受 `sessionsRoot: string` 参数。

#### Scenario: New factory signature
- **WHEN** 调用 `createMetricsMiddleware(onMetricsUpdate)`
- **THEN** 返回的 middleware SHALL 聚合指标并在每次调用后触发回调

## REMOVED Requirements

### Requirement: Metrics file persistence
**Reason**: Metrics 持久化职责从 Runtime 移除，由调用方通过 `onMetricsUpdate` 回调自行实现
**Migration**: 调用方在 `onMetricsUpdate` 回调中实现文件写入逻辑，参考原 `persistMetrics` 函数

## ADDED Requirements

### Requirement: MetricsSnapshot type
系统 SHALL 定义 `MetricsSnapshot` 类型，结构为 `{ tools: Record<string, ToolMetrics> }`，复用现有 `SessionMetrics` 的结构。

#### Scenario: Snapshot content
- **WHEN** `onMetricsUpdate` 被调用
- **THEN** 回调参数 SHALL 包含所有已调用工具的完整 `ToolMetrics` 数据

### Requirement: RuntimeConfig onMetricsUpdate callback
`RuntimeConfig` SHALL 增加 `onMetricsUpdate?: (snapshot: MetricsSnapshot) => void` 可选字段，由 `createRuntime` 透传给 `createToolHandler`。

#### Scenario: RuntimeConfig with onMetricsUpdate
- **WHEN** `RuntimeConfig.onMetricsUpdate` 被设置
- **THEN** `createRuntime` SHALL 将该回调传递给 `createToolHandler`，进而传递给 `createMetricsMiddleware`

#### Scenario: RuntimeConfig without onMetricsUpdate
- **WHEN** `RuntimeConfig.onMetricsUpdate` 未设置
- **THEN** metrics middleware SHALL 正常聚合指标，不触发回调
