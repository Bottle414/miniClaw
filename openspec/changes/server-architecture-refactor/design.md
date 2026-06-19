## Context

`@mini-claw/server` 当前是一个单文件 Express 5 应用（206 行 `src/index.ts`），包含：
- 4 个 HTTP 端点：`GET /api/health`、`GET /api/sessions`、`GET /api/session/:id`、`POST /api/chat`
- SSE 流式推送逻辑
- per-session runtime 缓存（Map 闭包）
- 辅助函数（`convertMessages`、`serializeEvent`）
- 无单元测试、无测试框架

项目约束：ESM-only、TypeScript strict、函数+闭包优先于类、使用 `logger()` 替代 `console.log`。

## Goals / Non-Goals

**Goals:**
- 将 server 拆分为清晰的 controller / service 分层架构
- controller 只做路由注册和参数提取，service 承载业务逻辑
- 路由前缀抽取为常量，松耦合便于修改
- controller 和 service 方法命名一致，service 带 `Service` 后缀
- 为所有接口补充单元测试
- 保持所有现有接口行为不变（零 breaking change）

**Non-Goals:**
- 不新增 API 接口
- 不改动 runtime 包或其他包
- 不引入依赖注入框架
- 不做 E2E 测试（仅单元测试）
- 不修改前端代码

## Decisions

### 1. 目录结构

```
src/
├── index.ts              # 入口：创建 app、加载中间件、注册路由、启动监听
├── constants.ts          # 路由前缀常量、其他共享常量
├── controller/
│   ├── health.controller.ts
│   ├── session.controller.ts
│   └── chat.controller.ts
└── service/
    ├── session.service.ts
    ├── chat.service.ts
    └── utils.ts          # convertMessages、serializeEvent
```

**理由**：每个 controller 文件对应一组相关路由（按资源分组），service 按业务领域分组。辅助函数放在 `service/utils.ts` 因为它们服务于 service 层的数据转换。

**备选**：按功能模块（feature）分组（每个模块包含自己的 controller + service）。否决原因——当前只有 4 个接口，模块化分组过早，增加文件跳转成本。

### 2. 路由常量设计

```typescript
// constants.ts
export const ROUTES = {
  HEALTH: '/api/health',
  SESSIONS: {
    LIST: '/api/sessions',
    DETAIL: '/api/session/:id',
  },
  CHAT: '/api/chat',
} as const;
```

**理由**：嵌套对象按资源分组，`as const` 保证类型字面量推断。controller 引用常量而非硬编码字符串。

### 3. Controller / Service 命名约定

- controller 导出函数名与 service 方法名一致
- service 导出对象，方法名即业务操作名
- 示例：`session.controller.ts` 导出 `list`、`detail`；`session.service.ts` 导出 `sessionService.list`、`sessionService.detail`

```typescript
// controller/session.controller.ts
import { sessionService } from '../service/session.service.js';
export const list = async (req: Request, res: Response) => {
  const sessions = await sessionService.list();
  res.json({ sessions });
};
```

### 4. 注册路由方式

入口文件 `index.ts` 集中注册路由，从 controller 导入处理函数：

```typescript
import { healthCheck } from './controller/health.controller.js';
import { list, detail } from './controller/session.controller.js';
import { chat } from './controller/chat.controller.js';

app.get(ROUTES.HEALTH, healthCheck);
app.get(ROUTES.SESSIONS.LIST, list);
app.get(ROUTES.SESSIONS.DETAIL, detail);
app.post(ROUTES.CHAT, chat);
```

**理由**：路由注册集中在入口文件，一目了然所有端点。controller 文件保持纯粹（只导出处理函数），不耦合 Express app 实例。

**备选**：使用 Express Router 子路由（`express.Router()`）自动挂载。否决原因——当前路由数量少，集中注册更直观；Router 子路由适合大型项目。

### 5. 测试框架选型

选择 **vitest**（而非 jest）。

**理由**：
- 项目使用 ESM + TypeScript，vitest 原生支持零配置
- 与项目已有的 Vite 生态一致
- jest 对 ESM 支持仍需额外配置（`--experimental-vm-modules`）

### 6. 测试策略

- **Service 测试**：直接测试业务函数，mock 掉 runtime 依赖
- **Controller 测试**：使用 `supertest` + 真实 Express app 实例，mock service 层
- 测试文件与源文件同目录（`*.test.ts`）

## Risks / Trade-offs

- **[风险] 重构引入回归** → 所有接口行为不变，通过单元测试覆盖保证
- **[权衡] 文件数量增加** → 当前 4 个接口拆为 ~8 个文件是可接受的复杂度增长；比单文件 206 行更易维护
- **[风险] SSE 流式测试复杂** → chat controller 测试聚焦于请求参数校验和响应头，SSE 事件流测试在 service 层通过 mock AsyncIterable 覆盖
