## Why

当前 runtime 入口 (`apps/runtime/src/index.ts`) 将对话交互（readline 输入、流式输出渲染、工具状态展示）与 runtime 核心逻辑（session 管理、ReAct 循环、memory 管理）紧密耦合在一起。这使得其他界面（Web UI、API 服务等）无法复用 runtime 能力。需要将 runtime 封装为独立的 `createRuntime` 工厂，把 TUI 交互抽离到 `apps/tui`，实现多界面接入。

## What Changes

- 新增 `createRuntime()` 工厂方法，返回 `{ chat, sessionManager, config }` 三个公共 API
- `chat(userInput, contextOptions?)` 封装 `executeReActLoop`，内部管理 messages、memory、summarizer，外部只需传入用户输入和可选上下文选项，返回 `AsyncIterable<RuntimeEvent>`
- 将现有 `index.ts` 中的 readline 交互和事件渲染逻辑迁移到 `apps/tui/src/index.ts`
- runtime 的 `index.ts` 改为仅导出 `createRuntime` 及相关类型
- `apps/tui` 包依赖 `@mini-claw/runtime`，通过 `createRuntime` 获取运行时实例

## Capabilities

### New Capabilities
- `runtime-factory`: `createRuntime` 工厂方法，封装 provider 初始化、session 管理、memory 状态、summarizer 创建，对外暴露 `chat`、`sessionManager`、`config`
- `chat-api`: `chat(userInput, contextOptions?)` 方法，内部管理 messages/memory/summarizer，封装 executeReActLoop 调用，返回 AsyncIterable<RuntimeEvent>

### Modified Capabilities
- `react-loop`: executeReActLoop 的调用方式不变，但由 chat 方法内部调用，不再由外部直接传 messages/memory/summarizer
- `runtime-event`: 事件协议不变，但 chat 方法可能需要新增 `chat-complete` 事件来通知调用方一轮对话结束及状态变更

## Impact

- `apps/runtime/src/index.ts`: 重写为 `createRuntime` 导出，删除 readline 和 UI 渲染逻辑
- `apps/tui/src/index.ts`: 新增 TUI 入口，消费 `createRuntime` 返回的 chat 方法
- `apps/tui/package.json`: 新增对 `@mini-claw/runtime` 的依赖
- `apps/runtime/src/react/loop.ts`: 无变更，但 ReActLoopConfig 的外部调用方式改变
- `apps/runtime/src/memory/`: 内部使用，不对外暴露 summarizer 创建细节
