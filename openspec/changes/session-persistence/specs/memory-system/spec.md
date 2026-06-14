## MODIFIED Requirements

### Requirement: 会话记忆存储会话作用域上下文

系统 SHALL 提供会话记忆，用于会话作用域的保留上下文，可注入到面向模型的上下文中。会话记忆 SHALL 支持从持久化 session 的 summary 和 facts 数据注入。

#### Scenario: 会话记忆被注入

- **WHEN** 会话记忆包含与模型请求相关的活跃条目
- **THEN** 上下文构建器应将这些条目作为模型可读上下文包含在 `contextMessages` 中
- **AND** 注入的条目不应追加到权威 `messages`，除非它们是真实对话消息

#### Scenario: 会话记忆可更新

- **WHEN** 运行时代码记录或替换会话级记忆条目
- **THEN** 后续上下文构建器运行应考虑更新后的会话记忆值

#### Scenario: 从持久化 session 加载 summary 和 facts 到会话记忆

- **WHEN** Runtime 启动时加载了持久化 session 且 session 包含 summary 或 facts 数据
- **THEN** 系统 SHALL 将 summary 内容作为会话记忆条目注入
- **AND** 系统 SHALL 将 facts 内容作为会话记忆条目注入
- **AND** 这些条目 SHALL 在后续上下文构建中可用

### Requirement: 权威消息保持完整

系统 SHALL 将 `messages` 保持为当前会话的权威完整对话历史，包括系统、用户、助手和工具消息。`messages` SHALL 支持从持久化 session 恢复。

#### Scenario: 用户消息被记录

- **WHEN** 用户提交输入
- **THEN** 系统 SHALL 将用户消息追加到 `messages`
- **AND** 系统不应在 `messages` 中丢弃或摘要该消息

#### Scenario: 助手和工具消息被记录

- **WHEN** 模型返回助手消息或工具执行返回工具消息
- **THEN** 系统 SHALL 将这些消息追加到 `messages`
- **AND** 追加的消息应在权威历史中保持可用

#### Scenario: 从持久化 session 恢复消息

- **WHEN** Runtime 启动时加载了持久化 session 且 session 包含 messages 数据
- **THEN** 系统 SHALL 将 session 的 messages 恢复到运行时 messages 数组
- **AND** 恢复后的 messages SHALL 作为权威对话历史继续使用
