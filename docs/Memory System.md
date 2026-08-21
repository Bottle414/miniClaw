# Memory System

## 为什么需要 Memory System

miniClaw 早期只有一份 `messages`，既作为完整对话历史，也直接作为发送给模型的上下文。这个设计简单，但会带来几个问题：

- **上下文不可控**：历史越长，Provider 请求越大，无法按策略保留、丢弃或压缩。
- **权威历史与模型输入耦合**：为了节省 token 如果直接改 `messages`，会破坏真实对话历史。
- **记忆缺少分层**：会话级事实、当前任务临时状态和真实消息混在一起，不利于后续检索、更新和清理。
- **摘要职责不清晰**：摘要不应该直接决定最终 `LLMMessage` 的形态，否则压缩、事实提取和上下文拼装会耦合在一起。
- **会话无法持久化**：所有数据仅存在于内存中，进程退出即丢失，无法恢复历史对话或复用已积累的上下文。

Memory System 的目标是把“完整历史”和“本次模型调用看到什么”分开：

- `messages` 保持为 canonical conversation history。
- `contextMessages` 是每次 Provider 调用前派生出来的 model-facing context。
- Session Memory / Working Memory 提供可注入的结构化上下文。
- Context Builder 负责根据策略组装上下文。
- Summarizer 只负责压缩消息并返回结构化摘要结果。
- Session Persistence 将对话、摘要和事实持久化到本地文件，支持跨会话恢复。

## 总体设计

核心数据流：

```text
canonical messages
       │
       │        session memory ◄── session.summary / session.facts
       │             │
       │        working memory
       │             │
       ▼             ▼
 ┌──────────────────────────┐
 │      Context Builder      │
 │  preserve / discard       │
 │  inject / summarize       │
 └──────────────────────────┘
       │
       ▼
 contextMessages
       │
       ▼
 Provider.chat / Provider.chatStream
       │
       ▼
 SummaryResult[] ──────────────► Session Persistence
                                      │
                                      ▼
                              .sessions/<id>/
                                metadata.json
                                messages.json
                                summary.json
                                facts.json
```

### 职责拆分

| 模块               | 职责                                                   | 不负责                         |
| ------------------ | ------------------------------------------------------ | ------------------------------ |
| `messages`         | 保存完整、真实的对话历史                               | token 压缩、上下文筛选         |
| Session Memory     | 保存会话作用域的上下文                                 | 替代真实对话消息               |
| Working Memory     | 保存当前任务/迭代的临时上下文                          | 长期持久化                     |
| Context Builder    | 构建 `contextMessages`，执行保留、丢弃、注入、摘要渲染 | 直接调用 Provider 生成摘要内容 |
| Summarizer         | 压缩选定消息，返回 `SummaryResult`                     | 决定最终消息顺序               |
| MemoryStore        | 持久化存储抽象，提供 save / load / delete / exists     | 业务逻辑、ID 生成              |
| SessionManager     | 管理 session 生命周期（create / load / save / delete） | 直接读写文件                   |
| Provider / adaptor | 发送统一 `LLMRequest`，做提供商类型转换                | 维护记忆状态、选择上下文       |

## Canonical Messages 与 Context Messages

### `messages`

`messages` 是当前会话的权威完整历史，包含：

- system message
- user message
- assistant message
- tool message

所有真实发生过的对话消息都应追加到 `messages`。Context Builder 进行的保留、丢弃、摘要等操作不能修改它。

```ts
const messages: LLMMessage[] = []
```

### `contextMessages`

`contextMessages` 是每次调用模型前临时构造的消息列表：

```ts
const { contextMessages } = await buildContext({
	messages,
	memory,
	options,
	summarizer
})
```

Provider 请求只使用 `contextMessages`：

```ts
await provider.chat({
	messages: contextMessages,
	model,
	tools
})
```

这样可以做到：

- 历史完整保留在 `messages`。
- 模型只看到本轮策略允许的上下文。
- 后续可以替换 Context Builder 策略，而不影响 Provider/adaptor 边界。

## Memory 分层

Memory System 当前分为两层：

```text
RuntimeMemoryState
├── session: SessionMemory
└── working: WorkingMemory
```

### Session Memory

Session Memory 保存会话级上下文，适合记录在当前会话中长期有效的信息，例如：

- 用户偏好
- 当前项目约束
- 已确认的设计决策
- 会话内持续有效的背景信息

这些信息可以被注入到 `contextMessages`，但不会自动写入 canonical `messages`，除非它本身就是一条真实对话消息。

### Working Memory

Working Memory 保存当前任务或当前循环中的临时上下文，例如：

- 当前正在执行的计划
- 临时中间结论
- 工具调用后的短期状态
- ReAct 循环中的临时观察

Working Memory 应该更容易清理。任务结束或上下文失效后，可以移除相关条目，避免污染后续模型输入。

## Context Builder

Context Builder 是 Memory System 的核心拼装模块。它接收完整历史和记忆状态，输出本次模型调用要使用的 `contextMessages`。

```ts
interface ContextBuilderInput {
	messages: LLMMessage[]
	memory: RuntimeMemoryState
	options?: ContextBuilderOptions
	summarizer?: Summarizer
}
```

### 支持的操作

| 操作        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| `preserve`  | 将近期消息原样保留到 `contextMessages`                 |
| `discard`   | 从模型输入中省略某些旧消息，但不删除 canonical history |
| `inject`    | 注入 Session Memory / Working Memory                   |
| `summarize` | 对旧消息执行摘要压缩，并渲染摘要结果                   |

Context Builder 会同时返回操作记录，方便调试和测试：

```ts
interface ContextBuildResult {
	contextMessages: LLMMessage[]
	operations: ContextBuildOperation[]
	summaryResult?: SummaryResult
}
```

### 默认策略

当前基础策略是按消息位置切分：

1. 保留最近 `preserveRecentMessages` 条消息。
2. 对更早的消息执行摘要，或按配置丢弃。
3. 注入活跃 Session Memory / Working Memory。
4. 保持 canonical `messages` 不变。

```text
messages = [old1, old2, old3, recent1, recent2]
                    │
                    ├─ olderMessages = [old1, old2, old3]
                    └─ recentMessages = [recent1, recent2]

contextMessages = [memory..., summary..., facts..., recent1, recent2]
```

### 输出顺序

结构化摘要引入后，Context Builder 负责把 `SummaryResult` 渲染为最终消息。稳定顺序是：

```text
[systemPrompt, summaryMessage, factMessage, ...recentMessages]
```

其中没有内容的部分可以省略，但相对顺序保持不变。当前实现中，Session Memory / Working Memory 也以 system message 形式注入，位于摘要和近期消息之前。

## Summarizer

Summarizer 的职责是“压缩消息并返回结构化数据”，而不是直接返回最终 `LLMSystemMessage`。

```ts
interface Summarizer {
	summarize(messages: LLMMessage[], sourceRange: SummarySourceRange): Promise<SummaryResult | null>
}
```

### SummaryResult

`SummaryResult` 是摘要压缩的结构化结果：

```ts
interface SummaryResult {
	summary: string
	extractedFacts: Fact[]
	sourceRange: [start: number, end: number]
	createdAt: number
	metadata?: Record<string, unknown>
}
```

字段说明：

| 字段             | 说明                                 |
| ---------------- | ------------------------------------ |
| `summary`        | 提取式摘要文本                       |
| `extractedFacts` | 从源消息中提取的结构化事实           |
| `sourceRange`    | 摘要覆盖的 canonical messages 闭区间 |
| `createdAt`      | 摘要创建时间                         |
| `metadata`       | 策略、响应 ID、模型等扩展信息        |

### Fact

`Fact` 表示可复用事实：

```ts
interface Fact {
	category: "user-preference" | "task" | "constraint" | "project-state"
	content: string
	source?: string
}
```

当前分类：

| category          | 说明                                     |
| ----------------- | ---------------------------------------- |
| `user-preference` | 用户偏好，例如输出语言、风格、工作方式   |
| `task`            | 当前任务目标或待办事项                   |
| `constraint`      | 约束条件，例如架构边界、禁止事项         |
| `project-state`   | 项目当前状态，例如已完成的设计或实现进度 |

## 结构化摘要压缩

基础 Memory System 最初可以使用 deterministic summarizer，把旧消息格式化为摘要。后续结构化摘要压缩在此基础上引入 LLM 摘要器：

```text
olderMessages
   │
   ▼
LLM Summarizer
   │  内部摘要请求，使用专用 system prompt
   ▼
SummaryResult
   │
   ▼
Context Builder render
   │
   ├─ summaryMessage
   ├─ factMessage
   └─ recentMessages
```

### 摘要生成器 System Prompt

LLM 摘要器使用专用的 `SUMMARY_GENERATOR_SYSTEM_PROMPT`。这个 prompt 只用于内部摘要请求，不进入最终任务上下文。

设计原因：

- 摘要生成指令是内部处理策略，不应该影响模型执行用户任务时的行为。
- 摘要必须是提取式的，不能自由发挥或编造事实。
- 输出必须是可解析的 JSON，避免把自然语言误当作结构化摘要。

### 内部摘要请求

摘要请求复用当前 Provider，但直接构造内部 `LLMRequest`：

```ts
await provider.chat({
	messages: [
		{ role: "system", content: SUMMARY_GENERATOR_SYSTEM_PROMPT },
		{ role: "user", content: renderMessagesForSummary(messages, sourceRange) }
	],
	model
})
```

注意：这个请求不会再次经过最终任务的 Context Builder，否则会产生递归构建问题。

### 解析与错误

LLM 摘要响应必须解析成预期 JSON 结构：

```json
{
	"summary": "...",
	"extractedFacts": [
		{
			"category": "task",
			"content": "...",
			"source": "message 1"
		}
	]
}
```

如果 JSON 无法解析，或字段不符合 schema，应抛出明确的摘要解析错误，而不是静默使用未校验的自然语言。

## Runtime 集成

### 旧循环

旧循环在调用 `provider.chat()` 或 `provider.chatStream()` 前，先异步构建上下文：

```ts
const contextMessages = await getContextMessages()

await provider.chat({
	messages: contextMessages,
	model: config.model,
	tools
})
```

工具调用产生的 assistant/tool 消息仍追加到 canonical `messages`，后续递归调用再次重新构建 `contextMessages`。

### ReAct 循环

ReAct 循环保持完整状态消息：

```ts
ReActState {
  messages: LLMMessage[]
}
```

Act 阶段调用模型前执行：

```ts
const { contextMessages, summaryResult } = await buildContext({
	messages: state.messages,
	memory,
	options: contextOptions,
	summarizer
})
```

循环结束后，`ReActLoopResult` 携带累积的摘要结果：

```ts
interface ReActLoopResult {
	state: ReActState
	response?: string
	error?: Error
	summaryResults: SummaryResult[]
}
```

调用方可将 `summaryResults` 追加到 session 并持久化。

这样可以保证：

- Provider 看到的是压缩后的 `contextMessages`。
- ReAct state 中仍保留完整 `messages`。

## 测试重点

Memory System 的测试应覆盖：

1. **canonical messages 不变**
    - Context Builder 执行保留、丢弃、摘要、注入时，原始 `messages` 不被修改。

2. **上下文构建顺序稳定**
    - memory/system context、summary message、fact message、recent messages 的相对顺序符合预期。

3. **摘要结构化解析**
    - 合法 JSON 能解析为 `SummaryResult`。
    - 非法 JSON 或非法 `Fact.category` 会产生明确错误。

4. **摘要 prompt 隔离**
    - 内部摘要请求包含 `SUMMARY_GENERATOR_SYSTEM_PROMPT`。
    - 最终任务的 `contextMessages` 不包含摘要生成器 prompt。

5. **ReAct 状态完整性**
    - ReAct Act 阶段发送压缩后的 `contextMessages`。
    - `state.messages` 仍保留完整历史。

6. **Session 持久化**
    - FileSystemMemoryStore 的 save/load/delete/exists 操作正确。
    - SessionManager 的 create/load/save/delete 生命周期正确，包括外部 ID 和 name。
    - Session 恢复：messages 还原到运行时数组，summary/facts 注入到 session memory。
    - 缺失文件时（如只有 metadata.json）load 优雅降级。

## 后续演进方向

当前 Memory System 仍是基础版本，后续可以继续演进：

- **token budget**：从固定 `preserveRecentMessages` 改为基于 token 预算选择上下文。
- **摘要缓存**：对相同 `sourceRange` 缓存 `SummaryResult`，减少重复 LLM 调用。
- **记忆检索**：引入关键词、标签或向量检索，按任务选择相关记忆。
- **摘要质量控制**：增加事实来源索引、置信度、重复事实合并和冲突检测。
- **策略配置化**：允许不同运行模式使用不同 Context Builder 策略。
- **远程存储**：MemoryStore 接口支持远程/云端存储实现。
- **session 列表与搜索**：支持列出、搜索、清理历史 session。
- **增量写入**：大 session 场景下，改为增量写入而非全量 JSON。

## 设计原则

- `messages` 是权威历史，不因上下文压缩被修改。
- `contextMessages` 是派生结果，每次模型调用前重新构建。
- Summarizer 返回数据，Context Builder 负责渲染消息。
- 摘要生成器 prompt 是内部机制，不污染最终任务上下文。
- Session 的 summary/facts 持久化后，下次启动可恢复为 session memory。
- MemoryStore 是抽象接口，FileSystemMemoryStore 是默认实现，未来可替换。
- SessionManager 处理业务逻辑（ID 生成、时间戳），MemoryStore 只负责 I/O。
- 所有模块使用函数+闭包实现，不使用 class，与项目约定一致。
- 先保证结构清晰和可测试，再扩展复杂的 token 预算、检索和持久化能力。

## Session Persistence

Session Persistence 为 Memory System 增加持久化能力，使对话可恢复、上下文可跨会话延续。

### 存储结构

每个 session 在存储根目录下创建一个文件夹，包含五个 JSON 文件：

```text
<sessionsRoot>/
  <sessionId>/
    metadata.json    — { id, name, createdAt, updatedAt }
    messages.json    — LLMMessage[]
    summary.json     — SummaryResult[]
    facts.json       — Fact[]
    reasoning.json   — ReasoningEntry[]
```

- `metadata.json` 包含 session 元数据，`createdAt` 和 `updatedAt` 使用 ISO 8601 字符串。
- `messages.json` 保存完整对话历史，消息顺序与运行时一致。
- `summary.json` 保存每次 Context Builder 产生的摘要结果。
- `facts.json` 保存从所有摘要中提取的结构化事实。
- `reasoning.json` 保存 LLM 思考过程，通过 `messageIndex` 与 messages 一一对应。reasoning 不注入到 LLM 上下文，仅用于前端 UI 渲染。

### ReasoningEntry

```ts
interface ReasoningEntry {
	/** 对应 messages 中的索引位置 */
	messageIndex: number
	/** 思考过程内容 */
	reasoning: string
}
```

reasoning 的数据流：

```text
LLM 流式响应 (reasoning-delta 事件)
  → StreamMerger 累积为 LLMAssistantMessage.reasoning
  → chat 完成后提取到 session.reasoning (ReasoningEntry[])
  → 持久化到 reasoning.json
  → 前端加载时通过 messageIndex 恢复到 ChatMessage.reasoning
```

设计要点：

- reasoning 不注入到 LLM 上下文（initSession 只注入 summary/facts 到 memory）
- 通过 `messageIndex` 而非消息 ID 关联，因为 messages 数组索引是稳定的
- 旧 session 无 `reasoning.json` 时，load 返回空数组（向后兼容）

### MemoryStore 接口

```ts
interface MemoryStore {
	save(sessionId: string, data: SessionData): Promise<void>
	load(sessionId: string): Promise<SessionData | null>
	delete(sessionId: string): Promise<void>
	exists(sessionId: string): Promise<boolean>
}
```

MemoryStore 是持久化存储的统一抽象。当前默认实现为 `createFileSystemMemoryStore(sessionsRoot)`，基于本地文件系统。未来可替换为远程/云端实现。

### SessionManager

```ts
function createSessionManager(store: MemoryStore, now?: () => number) {
	return {
		create: (options?: { id?: string; name?: string }) => Promise<Session>,
		load: (sessionId: string) => Promise<Session | null>,
		save: (session: Session) => Promise<void>,
		delete: (sessionId: string) => Promise<void>
	}
}
```

SessionManager 使用函数+闭包模式（不使用 class），负责：

- **ID 生成**：无外部 ID 时使用 `crypto.randomUUID()` 生成 UUID v4。
- **时间戳管理**：创建时设置 `createdAt` 和 `updatedAt`，保存时更新 `updatedAt`。
- **与 MemoryStore 交互**：负责 Session ↔ SessionData 的转换。

### Runtime 启动流程

```text
1. 从环境变量读取 SESSION_ID / SESSION_NAME / SESSIONS_ROOT
2. 创建 MemoryStore → createFileSystemMemoryStore(sessionsRoot)
3. 创建 SessionManager → createSessionManager(store)
4. 如果 SESSION_ID 存在 → sessionManager.load(id)
   - 加载成功：恢复 session
   - 加载失败：sessionManager.create({ id, name }) 创建新 session
5. 如果无 SESSION_ID → sessionManager.create() 创建新 session
6. 恢复 session.messages 到运行时 messages 数组
7. 将 session.summary/facts 注入 RuntimeMemoryState 的 session memory
8. 每轮对话结束后 sessionManager.save(session) 持久化
9. 摘要产生后将 SummaryResult 追加到 session.summary，Fact 追加到 session.facts
```

### Session 与 SessionData 转换

```ts
// Session → SessionData（持久化）
function sessionToData(session: Session): SessionData {
	return {
		metadata: { id, name, createdAt, updatedAt },
		messages,
		summary,
		facts,
		reasoning
	}
}

// SessionData → Session（运行时）
function dataToSession(data: SessionData): Session {
	return { ...metadata, messages, summary, facts, reasoning }
}
```

### 环境变量

| 变量            | 说明                | 默认值               |
| --------------- | ------------------- | -------------------- |
| `SESSIONS_ROOT` | session 存储根目录  | `<cwd>/.sessions`    |
| `SESSION_ID`    | 要加载的 session ID | 无（创建新 session） |
| `SESSION_NAME`  | session 名称        | `session-<id>`       |
