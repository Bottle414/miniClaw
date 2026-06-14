## 1. 类型定义

- [x] 1.1 在 `memory/types.ts` 中新增 SessionMetadata 类型（id, name, createdAt, updatedAt）
- [x] 1.2 在 `memory/types.ts` 中新增 SessionData 类型（metadata, messages, summary, facts）
- [x] 1.3 在 `memory/types.ts` 中新增 Session 类型（运行时对象，包含 id, name, createdAt, updatedAt, messages, summary, facts）
- [x] 1.4 在 `memory/types.ts` 中新增 MemoryStore 接口（save, load, delete, exists）
- [x] 1.5 在 `memory/types.ts` 中新增 SessionManagerOptions 类型（id?, name?）

## 2. MemoryStore 接口与文件系统实现

- [x] 2.1 创建 `memory/file-store.ts`，实现 `createFileSystemMemoryStore()` 工厂函数（函数+闭包，不使用类）
- [x] 2.2 实现 save 方法：创建 session 文件夹，写入 metadata.json / messages.json / summary.json / facts.json
- [x] 2.3 实现 load 方法：读取四个 JSON 文件，组装为 SessionData 返回；不存在返回 null
- [x] 2.4 实现 delete 方法：递归删除 session 文件夹
- [x] 2.5 实现 exists 方法：检查 session 文件夹是否存在

## 3. SessionManager

- [x] 3.1 创建 `memory/session-manager.ts`，实现 `createSessionManager()` 工厂函数（函数+闭包，不使用类）
- [x] 3.2 实现 create 方法：生成 UUID（或使用外部传入 id），设置 name，初始化空数据，调用 store.save
- [x] 3.3 实现 load 方法：调用 store.load，转换为 Session 运行时对象
- [x] 3.4 实现 save 方法：更新 updatedAt，将 Session 转换为 SessionData，调用 store.save
- [x] 3.5 实现 delete 方法：调用 store.delete

## 4. Runtime 集成

- [x] 4.1 修改 `index.ts` 启动流程：调用 `createSessionManager(store)` 创建 sessionManager
- [x] 4.2 修改 `index.ts`：支持从外部传入 sessionId 和 sessionName 参数
- [x] 4.3 修改 `index.ts`：启动时根据 sessionId 加载或创建 session
- [x] 4.4 修改 `index.ts`：将加载的 session.messages 恢复到运行时 messages 数组
- [x] 4.5 修改 `index.ts`：将加载的 session.summary 和 facts 注入到 RuntimeMemoryState 的 session memory
- [x] 4.6 修改 `index.ts`：每轮 ReAct 循环结束后调用 `sessionManager.save()` 持久化更新
- [x] 4.7 修改 `index.ts`：摘要产生后将 SummaryResult 和 Fact 追加到 session 并持久化

## 5. 导出与配置

- [x] 5.1 更新 `memory/index.ts` 导出新增模块
- [x] 5.2 在 `.env` 中新增 `SESSIONS_ROOT` 环境变量，通过 `utils/dotenv.ts` 的 `getDotenvConfig()` 加载，在 config 中提供默认值
- [x] 5.3 更新 `types/index.ts` 导出新增类型

## 6. 测试

- [x] 6.1 为 FileSystemMemoryStore 编写单元测试（save/load/delete/exists）
- [x] 6.2 为 SessionManager 编写单元测试（create/load/save/delete，含外部 ID 和 name）
- [x] 6.3 为 Runtime 集成编写测试（session 恢复、持久化保存）
