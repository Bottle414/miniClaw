## Why

`@mini-claw/server` 的所有代码（路由、业务逻辑、辅助函数）集中在一个 206 行的 `index.ts` 文件中，没有分层架构。随着接口增多，代码将难以维护和测试。现在需要将其拆分为 controller / service 分层架构，并补充单元测试，以便后续功能扩展和代码维护。

## What Changes

- 将 `src/index.ts` 拆分为入口文件 `index.ts`（仅启动服务）+ `controller/` 目录（纯路由）+ `service/` 目录（业务逻辑）
- 路由前缀抽取为常量（如 `ROUTES.SESSION.LIST`），松耦合便于修改
- controller 与 service 方法命名一致，service 方法带 `Service` 后缀（如 `userController.login` 调用 `userService.login`）
- 为所有接口编写单元测试，测试覆盖 controller 和 service 层
- 辅助函数（`convertMessages`、`serializeEvent`）移入 `service/` 或独立的工具模块

## Capabilities

### New Capabilities
- `server-controller-service`: server 包的 controller / service 分层架构，定义路由注册、业务逻辑分离、命名约定、路由常量化等规范
- `server-unit-testing`: server 包的单元测试体系，定义测试框架选型、测试结构、覆盖率要求

### Modified Capabilities
- `sse-server`: SSE 流式接口的实现从 index.ts 迁移至 controller/service 分层，接口行为不变但代码位置变更

## Impact

- **代码结构**：`apps/server/src/` 目录从单文件变为多目录结构（index.ts、controller/、service/）
- **API 兼容性**：所有 HTTP 接口路径和行为保持不变，无 **BREAKING** 变更
- **依赖**：新增测试框架（vitest）及相关类型依赖
- **构建**：`tsconfig.json` 可能需要调整以包含新的目录结构
