## 1. 类型定义

- [x] 1.1 在 `types/llm/tool.ts` 中新增 `PermissionConfig` 接口（`allow: string[]`, `check: string[]`, `deny: string[]`，所有字段可选，默认值 `["*"]`/`[]`/`[]`）
- [x] 1.2 在 `types/llm/tool.ts` 中新增 `MetricsSnapshot` 类型别名（`{ tools: Record<string, ToolMetrics> }`，复用 `SessionMetrics` 结构）
- [x] 1.3 在 `types/config/index.ts` 的 `RuntimeConfig` 中增加 `onMetricsUpdate?: (snapshot: MetricsSnapshot) => void` 可选字段

## 2. Permission Middleware 重写

- [x] 2.1 实现 `matchToolName(pattern: string, toolName: string): boolean` 通配符匹配工具函数，将 `*` 转为 `[^.]+` 正则
- [x] 2.2 重写 `createPermissionMiddleware` 签名为 `(config: PermissionConfig, onPermissionCheck: (toolName: string) => Promise<boolean>) => ToolMiddleware`
- [x] 2.3 实现 deny > check > allow 优先级逻辑：依次检查 deny → check → allow 列表，首个匹配决定结果
- [x] 2.4 实现 check 回调：匹配 check 规则时调用 `onPermissionCheck(toolName)`，根据返回值放行或拒绝
- [x] 2.5 处理未匹配任何规则的情况：默认拒绝，返回 `PERMISSION_DENIED` 错误
- [x] 2.6 实现 `loadPermissionConfig(rootDir: string): PermissionConfig` 函数，读取项目根目录 `permission.json`，文件不存在时返回默认配置，解析失败时抛错

## 3. Permission 配置文件

- [x] 3.1 在项目根目录创建 `permission.json` 模板文件，包含示例配置和注释说明

## 4. Cache-Metrics 链顺序修正

- [x] 4.1 调整 `tools/index.ts` 中默认中间件链顺序为 `permission → cancellation → metrics → cache → logging → retry → timeout`
- [x] 4.2 更新 `tools/index.ts` 中的链顺序注释

## 5. Metrics Middleware 重构

- [x] 5.1 重写 `createMetricsMiddleware` 签名为 `(onMetricsUpdate?: (snapshot: MetricsSnapshot) => void) => ToolMiddleware`，移除 `sessionsRoot` 参数
- [x] 5.2 移除 `persistMetrics` 函数和所有文件系统持久化逻辑（`fs`、`path` 导入）
- [x] 5.3 在指标聚合完成后调用 `onMetricsUpdate(snapshot)`，回调未提供时跳过
- [x] 5.4 构造 `MetricsSnapshot` 对象：`{ tools: Object.fromEntries(metricsMap) }`

## 6. ToolHandler 与 Runtime 集成

- [x] 6.1 修改 `createToolHandler` 签名，增加 `onMetricsUpdate` 和 `permissionConfig`/`onPermissionCheck` 参数
- [x] 6.2 更新 `createToolHandler` 中默认中间件链的构造，传入新参数
- [x] 6.3 移除 `createToolHandler` 中的 `permissions: Set<string>` 和 `addPermission` 方法
- [x] 6.4 更新 `createRuntime` 中的 `createToolHandler` 调用，从 `RuntimeConfig` 透传 `onMetricsUpdate`、`permissionConfig`、`onPermissionCheck`

## 7. 单元测试

- [x] 7.1 为 `matchToolName` 编写单测：精确匹配、单层通配符、全局通配符、不匹配场景
- [x] 7.2 为 `loadPermissionConfig` 编写单测：正常加载、文件不存在、格式错误
- [x] 7.3 为 Permission middleware 编写单测：deny 优先、check 回调确认/拒绝、allow 放行、未匹配拒绝
- [x] 7.4 为 Cache-Metrics 集成编写单测：缓存命中时 metrics 记录 callCount 和 cacheHits
- [x] 7.5 为 Metrics middleware 编写单测：回调触发、无回调时正常聚合、snapshot 内容正确
- [x] 7.6 更新 `tools/index.test.ts`：适配 `createToolHandler` 新签名

## 8. 文档更新

- [x] 8.1 更新 `docs/` 下相关文档，反映 Permission System、Metrics 回调机制的变更
