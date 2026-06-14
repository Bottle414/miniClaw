## Context

当前 miniClaw 运行时的所有会话数据（messages、RuntimeMemoryState、摘要/事实结果）仅驻留在内存中。`store.ts` 中的 `RuntimeMemoryState` 是纯函数式不可变状态，`context-builder.ts` 每轮从内存中的 messages 构建上下文。进程退出后一切丢失，用户无法恢复历史对话或复用已积累的上下文。

现有代码结构：
- `memory/store.ts` — RuntimeMemoryState（运行时内存状态，保持不变）
- `memory/types.ts` — 所有记忆相关类型
- `memory/context-builder.ts` — 从 messages + memory 构建上下文
- `memory/summarizer.ts` — 摘要器（简单 + LLM）
- `index.ts` — CLI 启动，每轮从空状态创建 memory

## Goals / Non-Goals

**Goals:**
- 为 session 提供本地文件持久化，使对话可恢复
- 抽象 MemoryStore 接口，解耦存储实现
- SessionManager 管理 session 生命周期（create / load / save / delete）
- 每个 session 以 UUID 标识，存储为本地文件夹下的四个 JSON 文件
- Runtime 启动时按 sessionId 加载已有数据，通过 ContextBuilder 注入运行时
- Session ID 和 name 可由外部传入

**Non-Goals:**
- 不做远程/云端存储
- 不做多 session 并发锁
- 不做 session 搜索/列表 UI
- 不修改 RuntimeMemoryState 的现有行为
- 不做自动过期/清理策略
- 不做加密存储

## Decisions

### Decision 1: 存储结构 — 每个 session 一个文件夹

每个 session 在存储根目录下创建 `<sessionId>/` 文件夹，包含四个 JSON：

```
<sessionsRoot>/
  <sessionId>/
    metadata.json    — { id, name, createdAt, updatedAt }
    messages.json    — LLMMessage[]
    summary.json     — SummaryResult[]
    facts.json       — Fact[]
```

**Why**: 四个文件分离关注点，messages 独立于 summary/facts，metadata 轻量可快速扫描。比单一大 JSON 更易增量读写，比数据库更简单无依赖。

**Alternatives**:
- 单个 session.json：简单但每次需读写全量数据，大 session 性能差
- SQLite：功能过重，引入依赖
- 每条消息一个文件：文件数爆炸，不必要

### Decision 2: MemoryStore 接口抽象

```ts
interface MemoryStore {
  save(sessionId: string, data: SessionData): Promise<void>
  load(sessionId: string): Promise<SessionData | null>
  delete(sessionId: string): Promise<void>
  exists(sessionId: string): Promise<boolean>
}
```

`SessionData` 包含 metadata + messages + summary + facts。

**Why**: 抽象接口使未来可替换为远程存储，FileSystemMemoryStore 作为默认实现。保持接口精简，只做 save/load/delete/exists。实现同样使用函数+闭包（`createFileSystemMemoryStore()`），符合项目约定。

### Decision 3: SessionManager 使用函数+闭包封装生命周期

遵循项目"使用函数+闭包代替类"的约定，SessionManager 以工厂函数实现：

```ts
function createSessionManager(store: MemoryStore) {
  return {
    create: (options?: { id?: string, name?: string }) => Promise<Session>,
    load: (sessionId: string) => Promise<Session | null>,
    save: (session: Session) => Promise<void>,
    delete: (sessionId: string) => Promise<void>,
  }
}
```

`Session` 是内存中的运行时对象，包含 id、name、messages、summary、facts、metadata 等。SessionManager 负责 ID 生成（UUID v4）、时间戳管理、与 MemoryStore 交互。

**Why**: 将 session 管理逻辑与存储实现分离。SessionManager 处理业务逻辑（ID 生成、时间戳），MemoryStore 只负责 I/O。使用函数+闭包符合项目代码约定，与现有 `createRuntimeMemoryState()` 等工厂函数风格一致。

**Alternatives**:
- class SessionManager：违反项目"使用函数+闭包代替类"约定

### Decision 4: UUID v4 作为 session ID

使用 `crypto.randomUUID()` 生成 session ID。外部可传入已有 ID 用于加载。

**Why**: UUID 无碰撞、无需中心协调、标准库支持。外部传入 ID 用于加载已有 session 是必须的。

**Alternatives**:
- 自增整数：需维护计数器，多实例冲突
- 时间戳：碰撞风险
- nanoid：需额外依赖，标准库 UUID 足够

### Decision 5: Runtime 集成方式

Runtime 启动时：
1. 调用 `createSessionManager(store)` 创建 sessionManager
2. 如果传入 sessionId → `sessionManager.load(id)` 加载已有 session
3. 否则 → `sessionManager.create()` 创建新 session
4. 将 session.messages 注入到运行时 messages 数组
5. 将 session.summary/facts 注入到 RuntimeMemoryState 的 session memory
6. 每轮对话结束后 `sessionManager.save(session)` 持久化

**Why**: 最小改动集成。利用现有 ContextBuilder 的 session memory 注入机制，summary/facts 作为 session memory entries 注入，无需修改 ContextBuilder 核心逻辑。

## Risks / Trade-offs

- **[文件 I/O 延迟]** → 每次 save 是全量写入 JSON，大 session 可能慢。Mitigation：当前阶段可接受，未来可增量写入或分片
- **[并发写入损坏]** → 无文件锁，多进程写同一 session 可能损坏。Mitigation：当前单进程使用，未来可加文件锁
- **[磁盘空间]** → 无自动清理，长期使用积累大量 session 文件。Mitigation：当前非目标，未来可加 TTL 或手动清理
- **[messages.json 增长]** → 完整对话历史持续增长。Mitigation：现有 ContextBuilder 已有 summarize 机制控制发给模型的消息量，磁盘存储不限制
