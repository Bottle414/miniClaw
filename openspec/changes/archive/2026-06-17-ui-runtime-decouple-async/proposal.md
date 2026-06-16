## Why

当前 runtime 通过 `onEvent` 回调向外部推送事件，且 `index.ts` 入口同时承担 CLI 交互（readline、stdout 打印）和 runtime 调用，导致 runtime 无法 headless 运行。未来 Web UI 等新接入方无法复用 runtime，必须重写。将 runtime 改为 AsyncIterable 产出事件后，任何 UI 层只需 `for await...of` 消费事件即可，天然支持挂起、顺序保证和 session 隔离。

## What Changes

- **BREAKING**：`executeReActLoop` 从 `async function` 改为 `async function*`，返回 `AsyncIterable<RuntimeEvent>` 而非 `Promise<ReActLoopResult>`
- **BREAKING**：删除 `ReActLoopConfig.onEvent` 回调，所有事件改为 `yield` 产出
- **BREAKING**：删除 runtime 内部的 `console.log`/`console.error`（contextMessages 调试打印等），runtime 不再直接与终端交互
- **BREAKING**：`ReActLoopResult` 不再作为返回值，改为在循环结束时 yield `LoopEndEvent`（携带终止信息），最终状态通过新增的 `LoopCompleteEvent` 产出
- `index.ts`（main 入口）改为 `for await...of` 消费 runtime 事件，负责 readline 输入和 stdout 渲染
- runtime 内部各 phase 函数（`executeThinkPhase`、`executeActPhase`、`executeObservePhase`、`executeDecidePhase`）同步改为 generator 或由主循环统一 yield

## Capabilities

### New Capabilities
- `async-react-loop`: `executeReActLoop` 改为 AsyncIterable generator，定义 yield 事件协议、输入输出契约

### Modified Capabilities
- `react-loop`: 输入契约变更（删除 onEvent，userInput 为唯一输入来源），输出契约变更（AsyncIterable 替代 Promise<ReActLoopResult>）
- `runtime-event`: 新增 `LoopCompleteEvent`（携带最终 state、response、summaryResults），使消费者无需从返回值获取结果
- `runtime-event-system`: 事件产出方式从回调推送改为 yield 拉取，消费模式从 `onEvent` 改为 `for await...of`

## Impact

- **代码**：`apps/runtime/src/react/loop.ts`（主改造）、`apps/runtime/src/index.ts`（消费端重写）、`apps/runtime/src/types/event/runtime-event.ts`（新增事件类型）
- **API**：`executeReActLoop` 签名 breaking change，`ReActLoopConfig` 删除 `onEvent` 字段
- **依赖**：无新增依赖，AsyncGenerator 为语言内置
- **下游**：所有直接调用 `executeReActLoop` 的代码需适配新签名（当前仅 `index.ts`）
