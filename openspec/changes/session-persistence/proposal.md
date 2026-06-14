## Why

当前 miniClaw 运行时的所有会话数据（消息历史、记忆状态、摘要结果）仅存在于内存中，进程退出即丢失。用户无法恢复之前的对话，也无法跨会话复用已积累的上下文（摘要、事实）。需要为 session 提供本地文件持久化，使对话可恢复、上下文可延续。

## What Changes

- 新增 `MemoryStore` 抽象接口，提供 `save` / `load` 等方法，作为持久化存储的统一契约
- 新增 `createSessionManager()` 工厂函数，返回提供 `create` / `load` / `save` / `delete` 方法的对象管理 session 生命周期
- 每个 session 以 UUID 为标识，存储在本地文件夹下，包含四个 JSON 文件：
  - `messages.json` — 完整对话历史
  - `summary.json` — 摘要结果
  - `facts.json` — 提取的事实
  - `metadata.json` — id、name、createdAt、updatedAt
- Session ID 可由外部传入（用于加载已有 session），也可自动生成
- Session name 可由外部传入
- Runtime 启动时，由注入的 sessionId 读取对应聊天记录和摘要/事实记录
- ContextBuilder 从已加载的 session 数据注入 messages，而非从空状态开始

## Capabilities

### New Capabilities
- `session-persistence`: session 持久化存储，包括 MemoryStore 抽象、SessionManager 管理、本地文件存储实现、runtime 启动加载

### Modified Capabilities
- `memory-system`: 新增 session 持久化需求，RuntimeMemoryState 需与持久化存储协作，ContextBuilder 需从已加载 session 注入上下文

## Impact

- `apps/runtime/src/memory/` — 新增 MemoryStore 接口、createSessionManager() 工厂函数、createFileSystemMemoryStore() 工厂函数
- `apps/runtime/src/memory/store.ts` — RuntimeMemoryState 保持不变，作为运行时内存状态
- `apps/runtime/src/memory/context-builder.ts` — 需支持从已加载 session 数据注入 messages
- `apps/runtime/src/index.ts` — 启动流程需集成 SessionManager，按 sessionId 加载数据（使用函数+闭包模式）
- `apps/runtime/src/types/` — 新增 session 相关类型定义
- 本地文件系统 — 新增 session 存储目录
