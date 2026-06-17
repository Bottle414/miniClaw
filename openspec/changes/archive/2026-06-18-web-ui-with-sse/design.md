## Context

miniClaw 是一个 AI Agent 项目，runtime 包（`@mini-claw/runtime`）通过 `AsyncIterable<RuntimeEvent>` 对外暴露流式事件。当前仅有 TUI（终端界面）通过 `for await` 消费该事件流。Web UI 包（`@mini-claw/web`）是 Vite 脚手架空壳，无 runtime 集成。不存在 `apps/server` 包。

Runtime 运行在 Node.js 环境，Web UI 运行在浏览器，两者无法直接通信，需要一个中转层。

## Goals / Non-Goals

**Goals:**

- 搭建 Express SSE 中转服务器，将 runtime 的 `AsyncIterable<RuntimeEvent>` 转为 SSE 事件流
- 实现 AI Chat 风格的 Web UI（参考 ChatGPT/Claude 等界面）
- Web UI 实现消息合并机制：text-delta chunk → 合并为消息 → 非完整消息持续更新 → 完整消息后新建
- Web UI 实现 segment 拆分机制：每次合并后用正则拆分文字为 segments，架构预留 image/card 扩展
- 保持 runtime 不变，所有桥接逻辑在 server 和 web 层

**Non-Goals:**

- 不修改 runtime 包的任何代码或 API
- 不实现用户认证/多用户隔离
- 不实现 WebSocket（SSE 足够满足单向流式推送需求）
- 不实现会话管理 UI（会话列表、切换等）
- 不实现 markdown 渲染（后续迭代）
- 不实现工具调用的可视化展示（后续迭代）

## Decisions

### 1. SSE over WebSocket

**选择**: Server-Sent Events

**理由**: runtime 事件流是单向的（server → client），SSE 天然适合单向推送，协议简单，浏览器原生支持 `EventSource`，无需额外库。WebSocket 的双向能力在此场景下是过度设计。

**备选**: WebSocket — 更灵活但复杂度更高，当前不需要 client → server 的流式通信。

### 2. Express 作为中转服务器

**选择**: Express + cors

**理由**: 轻量、生态成熟、SSE 实现简单（`res.write()` + `Content-Type: text/event-stream`）。项目约定 function+closure over classes，Express 的中间件模式与此契合。

**备选**: Fastify — 性能更好但引入额外学习成本，当前规模不需要。

### 3. 消息合并策略

**选择**: 基于 `finish` 和 `loop-complete` 事件判断消息完整性

**机制**:
- 每个 `text-delta` 追加到当前 assistant 消息的 `content` 字段
- 收到 `finish` 事件标记当前 LLM 回合结束
- 收到 `loop-complete` 事件标记整个对话回合结束，下一条 `text-delta` 创建新消息
- `iteration-start`（iteration > 0）表示多轮思考，同一条消息内继续追加

**理由**: 与 runtime 的事件协议对齐，无需额外状态推断。

### 4. Segment 拆分机制

**选择**: 正则拆分 + 类型标记

**机制**:
- 每次消息内容更新后，用正则将文字拆分为 `Segment[]`
- 当前仅 `TextSegment: { type: "text", content: string }`
- 预留 `ImageSegment: { type: "image", url: string }`、`CardSegment: { type: "card", title: string, content: string }`
- 正则模式：当前整体匹配为 text segment；未来可扩展匹配 `![alt](url)` 为 image segment 等

**理由**: 为后续扩展预留架构，当前实现保持简单。

### 5. Web UI 技术栈

**选择**: React 19 + Vite（已有脚手架）+ 纯 CSS

**理由**: 项目已有 React 19 + Vite 脚手架，无需引入额外 UI 框架。纯 CSS 保持轻量，与项目 function+closure 风格一致。

**备选**: TailwindCSS — 引入构建依赖，当前规模不需要。

### 6. SSE 事件格式

**选择**: 每个事件用 `event` 字段标识类型，`data` 字段为 JSON

```
event: runtime-event
data: {"type":"text-delta","delta":"Hello"}
```

**理由**: SSE 标准格式，浏览器 `EventSource` 可按 event type 过滤，JSON data 便于解析。

## Risks / Trade-offs

- **[SSE 连接中断]** → 前端实现自动重连（`EventSource` 原生支持），重连后丢失的事件无法恢复（当前可接受，后续可加事件序列号）
- **[单用户限制]** → 当前设计为单用户本地使用，无并发控制。多用户场景需后续引入会话管理
- **[CORS 开发配置]** → 开发环境需配置 CORS 允许 Vite dev server 跨域访问 Express server
- **[Error 事件序列化]** → `ErrorEvent.error` 是 Error 对象，JSON.stringify 会丢失堆栈。SSE 传输时需转为 `{ message, stack }` 结构
