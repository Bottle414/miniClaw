## 1. 类型层重构

- [ ] 1.1 创建 `types/event/provider-event.ts`：将 `runtime-event.ts` 内容重命名，RuntimeEvent → ProviderEvent，删除 ToolResultEvent，文件内所有子类型接口名不变（TextDeltaEvent 等）
- [ ] 1.2 创建 `types/event/runtime-event.ts`：定义 RuntimeLifecycleEvent 子类型（IterationStartEvent、PhaseChangeEvent、ToolExecuteEvent、ToolResultEvent、LoopEndEvent），type 值无 react- 前缀；定义 RuntimeEvent = ProviderEvent | RuntimeLifecycleEvent；定义 RuntimeLifecycleEvent 子集类型
- [ ] 1.3 更新 `types/event/index.ts`：导出 provider-event 和 runtime-event
- [ ] 1.4 重命名 `types/react/phase.ts` 中 ReActPhase → RuntimePhase
- [ ] 1.5 删除 `types/react/event.ts`
- [ ] 1.6 更新 `types/react/index.ts`：移除 event 导出，改为从 `types/event` 重导出 RuntimeEvent 相关类型（保持导入路径兼容）
- [ ] 1.7 更新 `types/index.ts`：确认 event 和 react 导出正确

## 2. Provider / Adaptor 层更新

- [ ] 2.1 更新 `types/providers/index.ts`：RuntimeEvent → ProviderEvent（Provider.chatStream 返回类型、LLMAdapter.transformStreamChunk 参数类型）
- [ ] 2.2 更新 `provider/deepseek.ts`：RuntimeEvent → ProviderEvent（import 和 chatStream 返回类型）
- [ ] 2.3 更新 `adaptor/deepseek/index.ts`：RuntimeEvent → ProviderEvent（import 和 transformStreamChunk 返回类型）

## 3. Stream Merger 更新

- [ ] 3.1 更新 `utils/message.ts`：RuntimeEvent → ProviderEvent（import、mergeStreamMessage 参数、createStreamMerger.push 参数），删除 switch 中 `"tool-result"` 的跳过注释

## 4. ReAct Loop 更新

- [ ] 4.1 更新 `react/loop.ts`：ReActEvent → RuntimeEvent（import、ReActLoopConfig.onEvent、emitEvent、各 phase 函数签名），ReActPhase → RuntimePhase，事件 type 值去 react- 前缀（react-iteration-start → iteration-start 等），ProviderEvent 透传时不再跳过 tool-result（已从 ProviderEvent 删除）
- [ ] 4.2 更新 `react/loop.test.ts`：RuntimeEvent → ProviderEvent（import、createProvider），更新事件消费逻辑

## 5. 入口层清理

- [ ] 5.1 删除 `index.ts` 中 sendMessageLegacy 函数
- [ ] 5.2 删除 `index.ts` 中 sendMessageLegacyStream 函数
- [ ] 5.3 删除 `index.ts` 中 USE_REACT_LOOP 常量和旧循环分支逻辑
- [ ] 5.4 更新 `index.ts` 中 sendMessageReAct 的 onEvent 回调：ReActEvent → RuntimeEvent，事件 type 去 react- 前缀
- [ ] 5.5 清理 `index.ts` 中不再需要的 import（RuntimeEvent 旧 import、createToolMessagesFromProviderCalls 如果仅旧循环使用）
- [ ] 5.6 简化 main() 函数：移除旧循环分支，直接调用 sendMessageReAct

## 6. 文档更新

- [ ] 6.1 更新 `docs/架构设计.md`：RuntimeEvent → ProviderEvent / RuntimeEvent 分层说明，事件类型表格，删除旧循环描述，更新目录结构
- [ ] 6.2 更新 `.trae/rules/文档规范.md`：运行原理部分删除旧循环，更新分层架构描述

## 7. 验证

- [ ] 7.1 运行 TypeScript 编译检查，确保无类型错误
- [ ] 7.2 运行现有测试，确保全部通过
