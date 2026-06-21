## ADDED Requirements

### Requirement: Permission configuration file
系统 SHALL 支持从项目根目录的 `permission.json` 文件加载权限配置。配置文件包含 `allow`、`check`、`deny` 三个字符串数组字段，每个字段值为工具名模式。

#### Scenario: Load permission.json at startup
- **WHEN** `createPermissionMiddleware` 被调用
- **THEN** 系统 SHALL 读取项目根目录的 `permission.json`，解析为权限规则

#### Scenario: permission.json not found
- **WHEN** 项目根目录不存在 `permission.json`
- **THEN** 系统 SHALL 使用默认配置 `{ allow: ["*"], check: [], deny: [] }`，即所有工具默认放行

#### Scenario: permission.json parse error
- **WHEN** `permission.json` 存在但格式无效
- **THEN** 系统 SHALL 抛出明确错误，阻止 Runtime 启动

### Requirement: Wildcard tool name matching
系统 SHALL 支持工具名通配符匹配，`*` 匹配单个层级的工具名段（即 `[^.]+`），`weather.*` 匹配 `weather.getWeather` 但不匹配 `weather.forecast.daily`。

#### Scenario: Exact name match
- **WHEN** 权限规则为 `"weather.getWeather"`
- **THEN** 仅匹配工具名 `weather.getWeather`，不匹配 `weather.getForecast`

#### Scenario: Single-level wildcard match
- **WHEN** 权限规则为 `"weather.*"`
- **THEN** 匹配 `weather.getWeather` 和 `weather.getForecast`，不匹配 `system.shutdown`

#### Scenario: Global wildcard match
- **WHEN** 权限规则为 `"*"`
- **THEN** 匹配所有工具名

### Requirement: Permission priority deny > check > allow
系统 SHALL 按优先级 `deny > check > allow` 评估权限。工具名依次检查 deny → check → allow 列表，首个匹配的列表决定权限结果。

#### Scenario: Tool in deny list
- **WHEN** 工具名匹配 deny 列表中的任一规则
- **THEN** 系统 SHALL 拒绝执行，返回 `{ error: { code: "PERMISSION_DENIED", message } }`

#### Scenario: Tool in check list but not in deny
- **WHEN** 工具名匹配 check 列表中的任一规则且不匹配 deny 列表
- **THEN** 系统 SHALL 调用 `onPermissionCheck` 回调请求确认

#### Scenario: Tool in allow list but not in deny or check
- **WHEN** 工具名匹配 allow 列表中的任一规则且不匹配 deny 和 check 列表
- **THEN** 系统 SHALL 放行执行

#### Scenario: Tool not matching any list
- **WHEN** 工具名不匹配 deny、check、allow 中的任一规则
- **THEN** 系统 SHALL 拒绝执行，返回 `{ error: { code: "PERMISSION_DENIED", message } }`

### Requirement: Check permission callback
系统 SHALL 支持 `onPermissionCheck` 回调，当工具匹配 check 规则时，调用 `onPermissionCheck(toolName: string): Promise<boolean>` 向调用方请求确认。

#### Scenario: User confirms check permission
- **WHEN** 工具匹配 check 规则且 `onPermissionCheck` 返回 `true`
- **THEN** 系统 SHALL 放行执行

#### Scenario: User denies check permission
- **WHEN** 工具匹配 check 规则且 `onPermissionCheck` 返回 `false`
- **THEN** 系统 SHALL 拒绝执行，返回 `{ error: { code: "PERMISSION_DENIED", message } }`

### Requirement: Permission middleware factory signature
`createPermissionMiddleware` SHALL 接受 `PermissionConfig` 和 `onPermissionCheck` 回调作为参数，不再接受 `getPermissions: () => Set<string>`。

#### Scenario: New factory signature
- **WHEN** 调用 `createPermissionMiddleware(config, onPermissionCheck)`
- **THEN** 返回的 middleware SHALL 根据 config 和回调实现权限控制

### Requirement: PermissionConfig type
系统 SHALL 定义 `PermissionConfig` 类型，包含 `allow: string[]`、`check: string[]`、`deny: string[]` 三个字段。

#### Scenario: Type definition
- **WHEN** 定义 `PermissionConfig` 接口
- **THEN** 接口 SHALL 包含 `allow: string[]`、`check: string[]`、`deny: string[]`，所有字段可选，默认值分别为 `["*"]`、`[]`、`[]`
