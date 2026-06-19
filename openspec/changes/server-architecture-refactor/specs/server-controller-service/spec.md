## ADDED Requirements

### Requirement: Controller-Service 分层架构
Server 包 SHALL 采用 controller / service 分层架构。controller 文件只负责路由处理（参数提取、响应格式化），service 文件负责业务逻辑。controller 和 service 方法名 SHALL 保持一致，service 导出对象的方法名带 `Service` 后缀的模块名前缀。

#### Scenario: Controller 调用 Service
- **WHEN** controller 处理一个请求
- **THEN** controller 仅提取请求参数并调用对应 service 方法，不包含业务逻辑

#### Scenario: Service 方法命名
- **WHEN** 定义 session 相关的 service 方法
- **THEN** service 导出对象命名为 `sessionService`，方法名为 `list`、`detail` 等，与 controller 导出的处理函数名一致

### Requirement: 入口文件职责
`src/index.ts` SHALL 仅负责创建 Express app、加载中间件、注册路由、启动监听。不包含任何业务逻辑或路由处理函数。

#### Scenario: 入口文件内容
- **WHEN** 查看 `src/index.ts`
- **THEN** 文件中只有 app 创建、中间件加载、路由注册（从 controller 导入处理函数）和 `app.listen()` 调用

### Requirement: 路由常量化
所有路由路径 SHALL 定义在 `src/constants.ts` 中的 `ROUTES` 常量对象内。controller 和入口文件 SHALL 引用常量而非硬编码字符串。

#### Scenario: 路由路径引用
- **WHEN** 注册路由 `GET /api/sessions`
- **THEN** 使用 `ROUTES.SESSIONS.LIST` 常量而非字符串 `'/api/sessions'`

#### Scenario: 路由常量结构
- **WHEN** 查看 `constants.ts`
- **THEN** `ROUTES` 对象按资源分组（如 `HEALTH`、`SESSIONS.LIST`、`SESSIONS.DETAIL`、`CHAT`），使用 `as const` 断言

### Requirement: Controller 文件组织
Controller 文件 SHALL 放置在 `src/controller/` 目录下，按资源分组。每个 controller 文件只导出路由处理函数，不导出 Express app 实例或 Router 实例。

#### Scenario: Controller 文件结构
- **WHEN** 查看 `src/controller/` 目录
- **THEN** 包含 `health.controller.ts`、`session.controller.ts`、`chat.controller.ts`，每个文件导出纯函数

### Requirement: Service 文件组织
Service 文件 SHALL 放置在 `src/service/` 目录下，按业务领域分组。辅助函数（如 `convertMessages`、`serializeEvent`）SHALL 放置在 `src/service/utils.ts` 中。

#### Scenario: Service 文件结构
- **WHEN** 查看 `src/service/` 目录
- **THEN** 包含 `session.service.ts`、`chat.service.ts`、`utils.ts`

#### Scenario: 辅助函数位置
- **WHEN** `convertMessages` 或 `serializeEvent` 被调用
- **THEN** 从 `src/service/utils.ts` 导入
