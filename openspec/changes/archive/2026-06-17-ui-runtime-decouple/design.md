## Context

miniClaw 当前架构中，入口层 `index.ts` 同时承担 CLI 交互和 runtime 循环编排职责，且保留了已废弃的旧循环（`sendMessageLegacy` / `sendMessageLegacyStream`）。事件类型命名与实际语义不匹配：`RuntimeEvent` 实际是 provider 流式事件，`ReActEvent` 才是 runtime 层面的完整事件。本次变更的目标是删除旧循环、重命名事件类型，为 UI-runtime 解耦奠定基础。

当前事件类型结构：

```
RuntimeEvent (types/event/runtime-event.ts)
  = TextDeltaEvent | ToolCallStartEvent | ToolCallDeltaEvent | ToolCallEndEvent | ToolResultEvent | FinishEvent | ErrorEvent

ReActEvent (types/react/event.ts)
  = 透传 LLM 流式事件 (6 种, type 无前缀)
  | ReAct 循环层级事件 (5 种, type 带 react- 前缀)
```

目标事件类型结构：

```
ProviderEvent (types/event/provider-event.ts)
  = TextDeltaEvent | ToolCallStartEvent | ToolCallDeltaEvent | ToolCallEndEvent | FinishEvent | ErrorEvent

RuntimeEvent (types/event/runtime-event.ts)
  = ProviderEvent (provider stream)
  | IterationStartEvent | PhaseChangeEvent | ToolExecuteEvent | ToolResultEvent | LoopEndEvent (runtime lifecycle)
```

## Goals / Non-Goals

**Goals:**
- 删除旧循环代码，消除 `USE_REACT_LOOP` 开关和旧循环分支
- 将 `RuntimeEvent` 重命名为 `ProviderEvent`，语义对齐为"provider 流式输出事件"
- 将 `ReActEvent` 重命名为 `RuntimeEvent`，语义对齐为"runtime 对外事件"
- Runtime lifecycle 事件 `type` 字段去掉 `react-` 前缀
- `ReActPhase` 重命名为 `RuntimePhase`，与 RuntimeEvent 体系对齐
- 所有引用点同步更新，保持编译通过

**Non-Goals:**
- 不重构 `executeReActLoop` 为 AsyncIterable 形式（下期做）
- 不改变 runtime 的 API 接口（onEvent 回调模式不变）
- 不处理 UI 层解耦（仅清理旧代码，为后续 UI 接入做准备）
- 不补全 ToolResultEvent 在 ProviderEvent 中的存在（ToolResultEvent 仅属于 RuntimeEvent lifecycle，Provider 不执行工具）

## Decisions

### Decision 1: 文件重组策略 — 合并到 `types/event/` 目录

**选择**: 将 ProviderEvent 和 RuntimeEvent 都放在 `types/event/` 目录下，删除 `types/react/event.ts`。

**理由**: 重命名后，RuntimeEvent 不再是 ReAct 模块专属的类型，而是 runtime 对外的统一事件类型。放在 `types/event/` 更符合其作为 runtime 层级类型的定位。`types/react/` 保留 phase、state、action、observation、termination 等纯 ReAct 内部类型。

**替代方案**: 保留 `types/react/event.ts`，仅重命名类型。缺点是 RuntimeEvent 不再属于 react 模块，放在 react 目录下语义混乱。

### Decision 2: Runtime lifecycle 事件 type 字段去 `react-` 前缀

**选择**: `react-iteration-start` → `iteration-start`，`react-phase-change` → `phase-change`，`react-tool-execute` → `tool-execute`，`react-tool-result` → `tool-result`，`react-loop-end` → `loop-end`。

**理由**: 事件已在 `RuntimeEvent` 语境下，`react-` 前缀是冗余的命名空间。去掉前缀后，事件名更简洁，且与 `ProviderEvent` 中的事件命名风格一致（如 `text-delta`、`tool-call-start` 都无模块前缀）。

**替代方案**: 保留 `react-` 前缀。缺点是命名冗余，且未来如果 runtime 支持非 ReAct 循环模式，`react-` 前缀会误导。

### Decision 3: ToolResultEvent 归属 RuntimeEvent lifecycle

**选择**: 从 ProviderEvent 中删除 `ToolResultEvent`，仅保留在 RuntimeEvent lifecycle 中（type: `"tool-result"`，接口名 `ToolResultEvent`）。

**理由**: Provider 只产出流式 token 事件（文本增量、工具调用增量等），不执行工具。工具执行和结果获取是 Runtime 的职责，ToolResultEvent 属于 Runtime lifecycle 事件。这也消除了 ProviderEvent 和 RuntimeEvent lifecycle 之间 ToolResultEvent 的命名冲突。

**替代方案**: 保留 ToolResultEvent 在 ProviderEvent 中，认为 provider 层面也需要通知工具结果。缺点是语义不准确——provider 不执行工具。

### Decision 4: RuntimeEvent 中 lifecycle 事件接口名去掉 `ReAct` 前缀

**选择**: `ReActIterationStartEvent` → `IterationStartEvent`，`ReActPhaseChangeEvent` → `PhaseChangeEvent`，`ReActToolExecuteEvent` → `ToolExecuteEvent`，`ReActToolResultEvent` → `ToolResultEvent`，`ReActLoopEndEvent` → `LoopEndEvent`。

**理由**: 接口名与 type 值保持一致（去掉前缀），命名更简洁。ToolResultEvent 不再与 ProviderEvent 冲突（已从 ProviderEvent 删除）。

### Decision 5: 旧循环删除范围

**选择**: 删除 `sendMessageLegacy`、`sendMessageLegacyStream`、`USE_REACT_LOOP` 常量、旧循环分支逻辑、`createToolMessagesFromProviderCalls` 的旧循环调用。保留 `createToolMessagesFromProviderCalls` 函数本身（可能被其他代码使用）。

**理由**: 旧循环已被 ReAct 循环完全替代，`USE_REACT_LOOP` 默认为 true，无保留必要。删除后入口层只保留 ReAct 循环路径，代码更清晰。

### Decision 5: ReActPhase 重命名为 RuntimePhase

**选择**: `ReActPhase` → `RuntimePhase`，`types/react/phase.ts` 中的类型定义同步更新。

**理由**: PhaseChangeEvent 的 phase 字段类型从 `ReActPhase` 改为 `RuntimePhase`，与 RuntimeEvent 命名体系一致。Phase 描述的是 runtime 循环的阶段（thinking/acting/observing/deciding），不是 ReAct 特有的概念。

**替代方案**: 保留 `ReActPhase`。缺点是与去 ReAct 前缀的整体方向不一致。

### Decision 6: `types/event/` 目录文件结构

**选择**:
- `types/event/provider-event.ts` — ProviderEvent 及其子类型（从原 `runtime-event.ts` 重命名）
- `types/event/runtime-event.ts` — RuntimeEvent 及其 lifecycle 子类型（新文件，合并原 `types/react/event.ts` 的内容）
- `types/event/index.ts` — 导出两者

**理由**: 两个事件类型有清晰的层级关系（RuntimeEvent 包含 ProviderEvent），分文件更清晰。原 `types/react/event.ts` 删除。

## Risks / Trade-offs

- **[BREAKING 类型重命名]** → 所有消费 RuntimeEvent/ReActEvent 的代码需更新。当前项目内引用点已全部识别，影响可控。
- **[type 值变更]** → lifecycle 事件 type 去掉 `react-` 前缀，如果有外部代码依赖 type 字符串匹配会 break。当前无外部消费者。
- **[ToolResultEvent 从 ProviderEvent 删除]** → stream merger (`utils/message.ts`) 中 switch 语句有 `"tool-result"` 的跳过逻辑，删除后需同步清理。
- **[types/react/event.ts 删除]** → `types/react/index.ts` 需更新导出，改为从 `types/event/` 重导出 RuntimeEvent 相关类型，保持向后兼容的导入路径。
