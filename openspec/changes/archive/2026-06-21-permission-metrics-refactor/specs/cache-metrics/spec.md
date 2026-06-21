## MODIFIED Requirements

### Requirement: Middleware chain order
中间件链顺序 SHALL 调整为 `permission → cancellation → metrics → cache → logging → retry → timeout`，将 metrics 移到 cache 之前，确保缓存命中时 metrics 仍可记录。

#### Scenario: Cache hit records metrics
- **WHEN** 工具调用命中缓存
- **THEN** metrics middleware SHALL 记录 `callCount++` 和 `cacheHits++`

#### Scenario: Cache miss records metrics
- **WHEN** 工具调用未命中缓存
- **THEN** metrics middleware SHALL 记录 `callCount++` 和 `cacheMisses++`

#### Scenario: Non-cacheable tool records metrics
- **WHEN** 工具的 `metadata.cacheable` 为 `false` 或未设置
- **THEN** metrics middleware SHALL 记录 `callCount++`，不记录 cacheHits 或 cacheMisses

## ADDED Requirements

### Requirement: Cache hit duration measurement
Cache 命中时，metrics middleware SHALL 记录从 `runtime.startedAt` 到缓存结果返回的耗时作为 `durationMs`。

#### Scenario: Cache hit duration
- **WHEN** 工具调用命中缓存
- **THEN** metrics middleware SHALL 记录 `durationMs` 为从 `runtime.startedAt` 到当前时间的差值
