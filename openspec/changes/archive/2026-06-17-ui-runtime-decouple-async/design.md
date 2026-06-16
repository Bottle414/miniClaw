## Context

当前 `executeReActLoop` 是一个 `async function`，通过 `onEvent` 回调向调用方推送 `RuntimeEvent`。`index.ts` 作为唯一入口，同时承担 readline 输入、stdout 渲染和 runtime 调用，runtime 无法 headless 运行。

项目中已有 AsyncIterable 先例：`Provider.chatStream()` 返回 `AsyncIterable<ProviderEvent>`，消费者通过 `for await...of` 拉取事件。本次改造将同一模式应用到 runtime 循环层。

关键约束：
- 项目使用 function+closure 模式，不用 class
- ESM only，TypeScript strict mode
- runtime 内部禁止直接 I/O（console.log/readline），仅入口层可做终端交互
- `index.ts`（main）始终是应用入口，不改变其定位，只改变其消费方式

## Goals / Non-Goals

**Goals:**
- `executeReActLoop` 改为 `async function*`，yield `RuntimeEvent`，删除 `onEvent` 回调
- runtime headless 化：删除 runtime 内部的 console.log/readline，输入仅来自 `userInput` 参数
- main 改为 `for await...of` 消费 runtime 事件，专职 CLI renderer consumer
- 新增 `LoopCompleteEvent` 携带最终 state/response/summaryResults，使消费者无需依赖返回值
- 保持与 `Provider.chatStream()` 一致的 AsyncIterable 消费模式

**Non-Goals:**
- 不实现 Web UI 接入（本次只做 headless 化，Web UI 是后续工作）
- 不改变 RuntimeEvent 的现有事件类型定义（仅新增 LoopCompleteEvent）
- 不改变 ReAct 循环的核心逻辑（Think-Act-Observe-Decide 流程不变）
- 不改变 session/memory 管理逻辑（仍在 main 中维护）
- 不引入新的依赖或抽象层

## Decisions

### D1：AsyncIterable 而非 EventEmitter / Observable

**选择**：`async function*` + `yield`

**备选**：
- EventEmitter：Node.js 传统方案，但回调嵌套、无背压、类型不安全
- RxJS Observable：功能强大但引入重依赖，与项目 function+closure 风格不符
- Callback（现状）：已在用，但 push 模型无法挂起、无法自然隔离 session

**理由**：AsyncIterable 是语言内置，零依赖；与 `Provider.chatStream()` 模式一致；天然支持 `for await...of` 消费、背压（消费者不取下一个，generator 自动挂起）、顺序保证、session 隔离（每次调用返回独立 iterable）。

### D2：LoopCompleteEvent 而非返回值

**选择**：新增 `LoopCompleteEvent`，作为最后一个 yield 事件，携带 `state`、`response`、`summaryResults`、`error`

**备选**：
- 返回 `{ result: ReActLoopResult, iterable: AsyncIterable<RuntimeEvent> }`：需要同时处理返回值和迭代，API 复杂
- 让消费者从 LoopEndEvent 推导结果：LoopEndEvent 缺少 state/summaryResults 等完整信息

**理由**：所有信息通过同一个 `for await...of` 流获取，消费者无需额外处理返回值。LoopCompleteEvent 在 LoopEndEvent 之后 yield，包含完整的结束状态。

### D3：Act 阶段用 async function* 实时 yield，其他 phase 返回事件数组

**选择**：`executeActPhase` 改为 `async function*`，主循环通过 `yield*` 委托，ProviderEvent 实时流出；`executeThinkPhase`、`executeObservePhase`、`executeDecidePhase` 保持为普通函数，返回事件数组，由主循环统一 yield

**备选**：
- 所有 phase 都是 `async function*`，用 `yield*` 委托：Think/Observe/Decide 的事件是瞬间产出的，无需 generator 的延迟语义，徒增类型复杂度
- 所有 phase 返回事件数组，主循环统一 yield：Act 阶段的 ProviderEvent 是流式拉取的，收集到数组后一次性 yield 会失去流式效果

**理由**：Act 阶段必须实时 yield ProviderEvent（text-delta 等），否则流式输出变成批量输出。Think/Observe/Decide 阶段的事件是瞬时的，用数组更简单。混合模式兼顾了流式实时性和其他阶段的简洁性。

### D4：删除 emitEvent helper

**选择**：删除 `emitEvent` 辅助函数，主循环直接 `yield`

**理由**：`emitEvent` 的 try/catch 保护不再需要——generator 中 `yield` 不会抛出（消费者异常会被 `for await...of` 的 catch 捕获，且会中断 generator）。callback 时代需要保护是因为回调异常会直接中断调用方，而 yield 是消费者主动拉取，天然安全。runtime 内部错误统一 catch 后通过 ErrorEvent / LoopCompleteEvent yield，不 throw，保证 stream 协议稳定。

### D5：runtime 内部 console.log 全部删除

**选择**：删除 `executeActPhase` 中的 contextMessages 调试打印

**理由**：runtime headless 化要求零 I/O。调试信息应通过事件流（如新增 debug 事件）传递，由消费者决定是否输出。当前 contextMessages 打印是临时代码，直接删除。

## Risks / Trade-offs

- **[Breaking change]** `executeReActLoop` 签名完全变更，所有调用方必须适配 → 当前仅 `index.ts` 一个调用方，影响范围可控
- **[Generator 错误处理]** AsyncGenerator 内部未捕获异常会直接终止 iterable。runtime SHALL 在内部统一捕获错误，并通过 ErrorEvent / LoopCompleteEvent 向外暴露结构化错误信息，而非直接 throw，使 RuntimeEvent stream 保持稳定协议
- **[背压语义]** AsyncIterable 天然背压，但如果消费者处理慢，会阻塞 generator（即 LLM stream 暂停）→ 这正是期望行为：消费者跟不上时暂停 stream，避免内存堆积
