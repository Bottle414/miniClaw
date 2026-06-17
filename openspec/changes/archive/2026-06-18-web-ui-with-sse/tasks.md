## 1. Server 包搭建

- [x] 1.1 创建 `apps/server` 目录结构：`src/index.ts`、`package.json`、`tsconfig.json`
- [x] 1.2 配置 `package.json`：name `@mini-claw/server`，依赖 `@mini-claw/runtime workspace:*`、`express`、`cors`、`dotenv`，devDeps `@types/express`、`@types/cors`、`tsx`、`typescript`
- [x] 1.3 配置 `tsconfig.json`：继承 `tsconfig.base.json`，outDir `./dist`，rootDir `./src`，types `["node"]`
- [x] 1.4 根 `package.json` 新增 scripts：`dev:server`、`dev:all`（concurrent dev:server + dev:web）

## 2. SSE 中转服务器实现

- [x] 2.1 实现 `src/index.ts`：加载 dotenv、创建 runtime 实例、启动 Express 监听
- [x] 2.2 实现 `GET /api/health` 端点，返回 `{ status: "ok" }`
- [x] 2.3 实现 `POST /api/chat` 端点：解析 `{ message }` body，设置 SSE headers，消费 `runtime.chat()` 的 AsyncIterable，逐事件写入 SSE 格式
- [x] 2.4 实现 Error 事件序列化：将 `Error` 对象转为 `{ message, stack }` 后 JSON.stringify
- [x] 2.5 配置 CORS 中间件，允许 Vite dev server origin（`http://localhost:5173`）
- [x] 2.6 实现 `loop-complete` 事件后关闭 SSE 连接

## 3. Web UI 消息模型与 Segment 系统

- [x] 3.1 创建 `apps/web/src/types/message.ts`：定义 `ChatMessage`（id, role, content, segments, isComplete）和 `Segment` 联合类型（TextSegment + 预留 ImageSegment/CardSegment）
- [x] 3.2 创建 `apps/web/src/lib/segment-splitter.ts`：实现 `splitSegments(content: string): Segment[]`，当前整体匹配为 TextSegment
- [x] 3.3 创建 `apps/web/src/lib/message-merger.ts`：实现消息合并逻辑 — text-delta 追加 content、finish/loop-complete 标记 isComplete、新 delta 创建新消息

## 4. SSE 客户端

- [x] 4.1 创建 `apps/web/src/lib/sse-client.ts`：封装 fetch-based SSE 连接，发送 POST 请求到 `/api/chat`，解析 SSE 事件流，yield `RuntimeEvent` 对象

## 5. React 组件

- [x] 5.1 创建 `apps/web/src/components/ChatMessage.tsx`：渲染单条消息，根据 role 显示用户/助手气泡，遍历 segments 渲染
- [x] 5.2 创建 `apps/web/src/components/SegmentRenderer.tsx`：根据 segment.type 分发渲染，TextSegment 渲染纯文本，未知类型渲染 fallback
- [x] 5.3 创建 `apps/web/src/components/ChatInput.tsx`：输入框 + 发送按钮，Enter 提交，空消息拦截
- [x] 5.4 创建 `apps/web/src/components/MessageList.tsx`：消息列表，auto-scroll 到最新消息
- [x] 5.5 创建 `apps/web/src/components/StreamingIndicator.tsx`：流式输出时的光标闪烁指示器

## 6. 状态管理与 App 组装

- [x] 6.1 创建 `apps/web/src/hooks/useChat.ts`：管理 messages 状态、SSE 连接、消息合并、发送消息
- [x] 6.2 改造 `apps/web/src/App.tsx`：组装 ChatMessage list + ChatInput + useChat hook，AI Chat 布局
- [x] 6.3 实现 `apps/web/src/App.css`：AI Chat 风格样式（居中内容区、消息气泡、底部输入栏）

## 7. Vite 代理配置

- [x] 7.1 配置 `apps/web/vite.config.ts`：添加 proxy，将 `/api` 请求代理到 Express server（`http://localhost:3000`）

## 8. 集成验证

- [x] 8.1 启动 server + web，发送消息验证 SSE 流式传输
- [x] 8.2 验证消息合并：多轮 text-delta 合并为一条消息，loop-complete 后新消息
- [x] 8.3 验证 segment 拆分：内容更新后 segments 正确计算
