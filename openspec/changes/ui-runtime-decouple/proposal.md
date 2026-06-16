## Why

miniClaw 的入口层 `index.ts` 将 CLI 交互（readline、process.stdout）与 runtime 循环逻辑（消息管理、session 持久化）耦合在一起，且保留了已废弃的旧循环（`sendMessageLegacy` / `sendMessageLegacyStream`），阻碍了 Web UI 等新接入方式的接入。同时，当前事件类型分层混乱：`RuntimeEvent` 实际是 provider 流式事件，`ReActEvent` 才是 runtime 层面的完整事件，命名与职责不匹配。需要删除旧循环、重新对齐事件类型命名，使 runtime 成为 UI 无关的独立模块。

## What Changes

- 删除旧循环代码（`sendMessageLegacy`、`sendMessageLegacyStream`、`USE_REACT_LOOP` 开关、旧循环分支逻辑）
- **BREAKING** 将 `RuntimeEvent` 重命名为 `ProviderEvent`，语义更准确地表达"provider 流式输出事件"
- **BREAKING** 将 `ReActEvent` 重命名为 `RuntimeEvent`，使其成为 runtime 对外暴露的顶层事件类型
- 新 `RuntimeEvent` 包含两类：`ProviderEvent`（provider 流式事件）和 runtime lifecycle 事件（iteration-start、phase-change、tool-execute、tool-result、loop-end）
- runtime lifecycle 事件的 `type` 字段去掉 `react-` 前缀（如 `react-iteration-start` → `iteration-start`），因为事件已在 RuntimeEvent 语境下，无需重复前缀
- `ReActPhase` 重命名为 `RuntimePhase`，与 RuntimeEvent 体系对齐
- 从 `ProviderEvent` 中删除 `ToolResultEvent`，因为 Provider 只产出流式 token 事件，不执行工具；工具结果属于 Runtime lifecycle 事件（`ToolResultEvent`，type: `"tool-result"`）
- 更新所有引用点：provider、adaptor、stream merger、ReAct loop、测试

## Capabilities

### New Capabilities
- `runtime-event-system`: 统一的 runtime 事件系统，包含 ProviderEvent（provider 流式事件）和 RuntimeEvent（runtime 对外事件 = ProviderEvent | RuntimeLifecycleEvent）

### Modified Capabilities
- `runtime-event`: 重命名为 ProviderEvent，语义从"runtime 事件"变为"provider 流式事件"
- `react-streaming`: 事件类型从 ReActEvent 重命名为 RuntimeEvent，lifecycle 事件 type 字段去掉 react- 前缀，onEvent 回调类型更新
- `react-loop`: 删除旧循环分支，onEvent 回调使用新的 RuntimeEvent 类型，emitEvent 使用新事件名

## Impact

- **类型层** (`types/event/`, `types/react/event.ts`): 文件重命名和类型重命名
- **Provider 层** (`provider/deepseek.ts`, `types/providers/index.ts`): RuntimeEvent → ProviderEvent
- **Adaptor 层** (`adaptor/deepseek/`): RuntimeEvent → ProviderEvent
- **Stream merger** (`utils/message.ts`): RuntimeEvent → ProviderEvent
- **ReAct loop** (`react/loop.ts`): ReActEvent → RuntimeEvent，事件名去 react- 前缀
- **入口层** (`index.ts`): 删除旧循环，更新事件消费
- **测试** (`react/loop.test.ts`): RuntimeEvent → ProviderEvent，更新事件消费
- **文档** (`docs/架构设计.md`): 更新事件类型说明
- **BREAKING**: 所有消费 RuntimeEvent 或 ReActEvent 的外部代码需更新
