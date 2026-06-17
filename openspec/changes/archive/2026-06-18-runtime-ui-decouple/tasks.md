## 1. 类型定义

- [x] 1.1 在 `apps/runtime/src/types/` 下创建 `runtime.ts`，定义 `RuntimeOptions` 接口（`env: Record<string, string | undefined>`, `sessionsRoot?: string`）和 `Runtime` 类型（`chat`, `sessionManager`, `config`）
- [x] 1.2 在 `apps/runtime/src/types/index.ts` 中重导出 `RuntimeOptions` 和 `Runtime`

## 2. createRuntime 工厂实现

- [x] 2.1 在 `apps/runtime/src/` 下创建 `runtime.ts`，实现 `createRuntime(options: RuntimeOptions): Runtime` 工厂方法
- [x] 2.2 createRuntime 内部实现：从 options.env 创建 config，初始化 provider，创建 memory/summarizer/sessionManager，加载或创建 session，恢复 session 状态到 memory
- [x] 2.3 createRuntime 内部实现：将 soulPrompt 添加到初始 messages（新 session 场景）

## 3. chat 方法实现

- [x] 3.1 在 `runtime.ts` 中实现 `chat(userInput: string, contextOptions?: ContextBuilderOptions): AsyncIterable<RuntimeEvent>`
- [x] 3.2 chat 内部构造 ReActLoopConfig：传入 provider、config、userInput、内部 messages、memory、contextOptions、summarizer、sessionId
- [x] 3.3 chat 实现为 async generator：`for await (const event of executeReActLoop(...))` yield 每个事件
- [x] 3.4 chat 在循环完成后更新内部 messages（从 loop-complete 的 state.messages 替换）
- [x] 3.5 chat 在循环完成后更新 memory（将 summaryResults 注入 session memory 和 facts）
- [x] 3.6 chat 在循环完成后更新 session 并调用 `sessionManager.save(session)`

## 4. runtime 入口重构

- [x] 4.1 重写 `apps/runtime/src/index.ts`，仅导出 `createRuntime` 及 `RuntimeOptions`、`Runtime` 类型
- [x] 4.2 删除 `index.ts` 中的所有副作用代码（dotenv 加载、main 函数、readline 交互、sendMessageReAct）
- [x] 4.3 确认 runtime 包不再有自动执行的入口代码

## 5. TUI 应用实现

- [x] 5.1 在 `apps/tui/package.json` 中添加对 `@mini-claw/runtime` 的依赖
- [x] 5.2 实现 `apps/tui/src/index.ts`：加载 dotenv，调用 `createRuntime`，创建 readline 接口
- [x] 5.3 实现 TUI 事件消费循环：`for await (const event of runtime.chat(input))` + switch 处理各 RuntimeEvent 类型
- [x] 5.4 迁移现有的 UI 渲染逻辑：text-delta → process.stdout.write，tool-call-start/execute/result → console.log 状态展示
- [x] 5.5 实现 TUI 主循环：rl.question 获取用户输入，调用 runtime.chat，支持 exit 退出

## 6. 验证

- [x] 6.1 `pnpm build` 确认 runtime 和 tui 包编译通过
- [x] 6.2 运行 tui 应用，验证多轮对话、工具调用、session 持久化功能正常
- [x] 6.3 验证 runtime 包无副作用导入：`import { createRuntime } from "@mini-claw/runtime"` 不触发任何自动执行
