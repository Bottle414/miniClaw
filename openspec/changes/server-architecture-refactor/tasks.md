## 1. 基础设施

- [x] 1.1 安装 vitest、supertest 及其类型依赖到 server 包
- [x] 1.2 在 server 包 `package.json` 中添加 `test` 脚本
- [x] 1.3 创建 `src/constants.ts`，定义 `ROUTES` 常量对象（`HEALTH`、`SESSIONS.LIST`、`SESSIONS.DETAIL`、`CHAT`），使用 `as const`

## 2. Service 层

- [x] 2.1 创建 `src/service/utils.ts`，迁移 `convertMessages` 和 `serializeEvent` 辅助函数
- [x] 2.2 创建 `src/service/session.service.ts`，实现 `sessionService.list()` 和 `sessionService.detail()`，封装 sessionManager 交互逻辑
- [x] 2.3 创建 `src/service/chat.service.ts`，实现 `chatService.chat()`，封装 per-session runtime 缓存和 chat 流式逻辑

## 3. Controller 层

- [x] 3.1 创建 `src/controller/health.controller.ts`，导出 `healthCheck` 处理函数，引用 `ROUTES.HEALTH`
- [x] 3.2 创建 `src/controller/session.controller.ts`，导出 `list` 和 `detail` 处理函数，调用 `sessionService` 对应方法
- [x] 3.3 创建 `src/controller/chat.controller.ts`，导出 `chat` 处理函数，调用 `chatService.chat()` 并处理 SSE 流式响应

## 4. 入口文件重构

- [x] 4.1 重写 `src/index.ts`，仅保留 app 创建、中间件加载、路由注册（从 controller 导入处理函数，引用 ROUTES 常量）和 `app.listen()`
- [x] 4.2 删除 `src/index.ts` 中所有业务逻辑和辅助函数代码

## 5. 单元测试

- [x] 5.1 编写 `src/service/utils.test.ts`，测试 `convertMessages` 过滤逻辑和 `serializeEvent` 序列化逻辑
- [x] 5.2 编写 `src/service/session.service.test.ts`，mock sessionManager，测试 `list` 和 `detail` 方法
- [x] 5.3 编写 `src/service/chat.service.test.ts`，mock runtime，测试 `chat` 方法的流式事件产出
- [x] 5.4 编写 `src/controller/health.controller.test.ts`，使用 supertest 测试 health 端点
- [x] 5.5 编写 `src/controller/session.controller.test.ts`，mock sessionService，测试 list 和 detail 端点的 HTTP 行为
- [x] 5.6 编写 `src/controller/chat.controller.test.ts`，mock chatService，测试 chat 端点的 SSE 响应头和参数校验

## 6. 验证

- [x] 6.1 运行 `pnpm test` 确认所有测试通过
- [x] 6.2 运行 `pnpm build` 确认 TypeScript 编译无错误
- [x] 6.3 手动启动 server 验证所有接口行为与重构前一致
