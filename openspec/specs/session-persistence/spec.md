# Session Persistence 规格

## Purpose

定义 miniClaw 运行时的会话持久化能力，包括存储抽象、文件系统实现、会话生命周期管理和运行时集成，使 session 数据可在进程重启后恢复。

## Requirements

### Requirement: MemoryStore 抽象接口

系统 SHALL 提供 MemoryStore 接口作为持久化存储的统一契约，包含 save、load、delete、exists 四个方法。

#### Scenario: 保存 session 数据

- **WHEN** 调用 MemoryStore 的 save 方法并传入 sessionId 和 SessionData
- **THEN** 系统 SHALL 将 SessionData 持久化到存储中
- **AND** 后续通过相同 sessionId 可加载到相同数据

#### Scenario: 加载已有 session

- **WHEN** 调用 MemoryStore 的 load 方法并传入已存在的 sessionId
- **THEN** 系统 SHALL 返回对应的 SessionData
- **AND** 返回的数据 SHALL 包含 metadata、messages、summary、facts

#### Scenario: 加载不存在的 session

- **WHEN** 调用 MemoryStore 的 load 方法并传入不存在的 sessionId
- **THEN** 系统 SHALL 返回 null

#### Scenario: 删除 session

- **WHEN** 调用 MemoryStore 的 delete 方法并传入 sessionId
- **THEN** 系统 SHALL 移除该 session 的所有持久化数据
- **AND** 后续 load 该 sessionId SHALL 返回 null

#### Scenario: 检查 session 是否存在

- **WHEN** 调用 MemoryStore 的 exists 方法并传入 sessionId
- **THEN** 系统 SHALL 返回 boolean 表示该 session 数据是否存在

### Requirement: 本地文件系统存储实现

系统 SHALL 提供 `createFileSystemMemoryStore()` 工厂函数，返回实现 MemoryStore 接口的对象，将数据存储在本地文件夹中。

#### Scenario: session 文件夹结构

- **WHEN** FileSystemMemoryStore 保存一个 session（通过 `createFileSystemMemoryStore()` 创建的实例）
- **THEN** 系统 SHALL 在存储根目录下创建 `<sessionId>/` 文件夹
- **AND** 该文件夹 SHALL 包含 metadata.json、messages.json、summary.json、facts.json 四个文件

#### Scenario: metadata.json 内容

- **WHEN** FileSystemMemoryStore 保存 session metadata
- **THEN** metadata.json SHALL 包含 id、name、createdAt、updatedAt 字段
- **AND** createdAt 和 updatedAt SHALL 为 ISO 8601 时间戳字符串

#### Scenario: messages.json 内容

- **WHEN** FileSystemMemoryStore 保存 session messages
- **THEN** messages.json SHALL 包含 LLMMessage 数组
- **AND** 消息顺序 SHALL 与运行时 messages 数组一致

#### Scenario: summary.json 内容

- **WHEN** FileSystemMemoryStore 保存 session summary
- **THEN** summary.json SHALL 包含 SummaryResult 数组
- **AND** 每个 SummaryResult SHALL 包含 summary、extractedFacts、sourceRange、createdAt

#### Scenario: facts.json 内容

- **WHEN** FileSystemMemoryStore 保存 session facts
- **THEN** facts.json SHALL 包含 Fact 数组
- **AND** 每个 Fact SHALL 包含 category 和 content

### Requirement: SessionManager 管理 session 生命周期

系统 SHALL 提供 `createSessionManager()` 工厂函数，返回封装 session 创建、加载、保存和删除操作的对象。遵循项目"使用函数+闭包代替类"约定。

#### Scenario: 创建新 session（无外部 ID）

- **WHEN** 调用 SessionManager.create() 不传入 id
- **THEN** 系统 SHALL 使用 UUID v4 生成唯一 session ID
- **AND** 系统 SHALL 创建空的 Session 对象（空 messages、summary、facts）
- **AND** 系统 SHALL 设置 createdAt 和 updatedAt 为当前时间
- **AND** 系统 SHALL 通过 MemoryStore 持久化该 session

#### Scenario: 创建新 session（外部传入 ID）

- **WHEN** 调用 SessionManager.create() 传入 id
- **THEN** 系统 SHALL 使用传入的 id 作为 session ID
- **AND** 系统 SHALL 创建并持久化该 session

#### Scenario: 创建 session 时传入 name

- **WHEN** 调用 SessionManager.create() 传入 name
- **THEN** 系统 SHALL 将 name 存储到 session 的 metadata 中

#### Scenario: 加载已有 session

- **WHEN** 调用 SessionManager.load() 传入已存在的 sessionId
- **THEN** 系统 SHALL 通过 MemoryStore 读取数据
- **AND** 系统 SHALL 返回包含 messages、summary、facts、metadata 的 Session 对象

#### Scenario: 加载不存在的 session

- **WHEN** 调用 SessionManager.load() 传入不存在的 sessionId
- **THEN** 系统 SHALL 返回 null

#### Scenario: 保存 session 更新

- **WHEN** 调用 SessionManager.save() 传入修改后的 Session
- **THEN** 系统 SHALL 更新 metadata 的 updatedAt 为当前时间
- **AND** 系统 SHALL 通过 MemoryStore 持久化更新后的数据

#### Scenario: 删除 session

- **WHEN** 调用 SessionManager.delete() 传入 sessionId
- **THEN** 系统 SHALL 通过 MemoryStore 删除该 session 的所有数据

### Requirement: Session 类型定义

系统 SHALL 定义 Session 类型，包含运行时所需的全部 session 数据。

#### Scenario: Session 包含完整数据

- **WHEN** 创建或加载 Session
- **THEN** Session SHALL 包含 id、name、createdAt、updatedAt、messages、summary、facts 字段
- **AND** messages SHALL 为 LLMMessage 数组
- **AND** summary SHALL 为 SummaryResult 数组
- **AND** facts SHALL 为 Fact 数组

### Requirement: Runtime 启动时加载 session

Runtime 启动时 SHALL 根据传入的 sessionId 加载或创建 session，并将数据注入运行时。

#### Scenario: 传入已有 sessionId 启动

- **WHEN** Runtime 启动时传入 sessionId 且该 session 存在
- **THEN** 系统 SHALL 加载该 session 的 messages 到运行时 messages 数组
- **AND** 系统 SHALL 将 session 的 summary 和 facts 注入到 RuntimeMemoryState 的 session memory

#### Scenario: 不传入 sessionId 启动

- **WHEN** Runtime 启动时不传入 sessionId
- **THEN** 系统 SHALL 创建新 session
- **AND** 运行时 messages 和 memory SHALL 为空

### Requirement: 对话结束后持久化 session

每轮对话结束后，系统 SHALL 将更新后的 session 数据持久化。

#### Scenario: ReAct 循环结束后保存

- **WHEN** 一轮 ReAct 循环完成
- **THEN** 系统 SHALL 将更新后的 messages 保存到 session
- **AND** 系统 SHALL 通过 SessionManager.save() 持久化

#### Scenario: 摘要产生后保存

- **WHEN** ContextBuilder 产生新的摘要或事实
- **THEN** 系统 SHALL 将新的 SummaryResult 追加到 session.summary
- **AND** 系统 SHALL 将新的事实追加到 session.facts
- **AND** 系统 SHALL 持久化更新后的 session
