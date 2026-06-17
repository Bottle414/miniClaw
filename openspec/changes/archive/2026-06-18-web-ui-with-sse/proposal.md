## Why

miniClaw 的 runtime 已与 UI 完美分离，但目前只有 TUI（终端界面）可以与之交互。需要一个 Web UI 让用户通过浏览器使用 miniClaw，同时需要一个 SSE 中转服务器桥接 Node.js runtime 与浏览器环境。

## What Changes

- 新增 `apps/server` 包（Express），作为 runtime 与 Web UI 之间的 SSE 中转站，将 `AsyncIterable<RuntimeEvent>` 转为 SSE 事件流推送给浏览器
- 改造 `apps/web` 包，从 Vite 脚手架变为可用的 AI Chat 界面，包含消息列表、输入框、流式渲染
- Web UI 实现消息合并机制：将 text-delta chunk 合并为消息，非完整消息持续更新，完整消息后新建消息继续合并
- Web UI 实现 segment 拆分机制：每次合并后用正则将文字拆分为 segments（当前仅 text segment，架构预留 image、card 等扩展）

## Capabilities

### New Capabilities

- `sse-server`: Express SSE 中转服务器，消费 runtime 的 AsyncIterable 事件流并以 SSE 推送给客户端
- `web-chat-ui`: 浏览器端 AI Chat 界面，包含消息渲染、流式输入、segment 拆分
- `message-merge`: Web UI 消息合并与 segment 拆分机制，将 streaming chunk 合并为结构化消息

### Modified Capabilities

（无现有 spec 需要修改，runtime API 不变）

## Impact

- 新增 `apps/server` 包，依赖 `@mini-claw/runtime`、`express`、`cors`
- 改造 `apps/web` 包，新增 React 组件、消息模型、SSE 客户端逻辑
- 根 `package.json` 需新增 `dev:server`、`dev:all` 等 scripts
- `pnpm-workspace.yaml` 无需修改（已包含 `apps/*`）
