## ADDED Requirements

### Requirement:权威消息保持完整

系统 SHALL 将 `messages` 保持为当前会话的权威完整对话历史，包括系统、用户、助手和工具消息。

#### Scenario:用户消息被记录

- **WHEN** 用户提交输入
- **THEN** 系统 SHALL 将用户消息追加到 `messages`
- **AND** 系统不应在 `messages` 中丢弃或摘要该消息

#### Scenario:助手和工具消息被记录

- **WHEN** 模型返回助手消息或工具执行返回工具消息
- **THEN** 系统 SHALL 将这些消息追加到 `messages`
- **AND** 追加的消息应在权威历史中保持可用

### Requirement:模型调用使用上下文消息

系统 SHALL 为模型调用构建独立的 `contextMessages` 列表，而非直接传递完整权威 `messages` 列表。

#### Scenario:创建 Provider 请求

- **WHEN** 运行时准备 Provider 对话或流式请求
- **THEN** 系统应使用权威消息和记忆状态调用上下文构建器
- **AND** Provider 请求应使用返回的 `contextMessages` 作为请求消息

#### Scenario:上下文构建不改变权威消息

- **WHEN** 上下文构建器为模型调用执行保留、丢弃、注入或摘要操作
- **THEN** 这些操作应仅影响 `contextMessages`
- **AND** 权威 `messages` 历史应保持不变

### Requirement:会话记忆存储会话作用域上下文

系统 SHALL 提供会话记忆，用于会话作用域的保留上下文，可注入到面向模型的上下文中。

#### Scenario:会话记忆被注入

- **WHEN** 会话记忆包含与模型请求相关的活跃条目
- **THEN** 上下文构建器应将这些条目作为模型可读上下文包含在 `contextMessages` 中
- **AND** 注入的条目不应追加到权威 `messages`，除非它们是真实对话消息

#### Scenario:会话记忆可更新

- **WHEN** 运行时代码记录或替换会话级记忆条目
- **THEN** 后续上下文构建器运行应考虑更新后的会话记忆值

### Requirement:工作记忆存储临时上下文

系统 SHALL 提供工作记忆，用于临时任务或迭代上下文，可在上下文构建时使用。

#### Scenario:工作记忆被包含于活跃工作

- **WHEN** 工作记忆包含活跃的临时上下文
- **THEN** 上下文构建器应能将该上下文注入 `contextMessages`
- **AND** 注入的工作上下文应可与权威对话消息区分

#### Scenario:工作记忆可清除

- **WHEN** 临时工作完成或不再相关
- **THEN** 系统应允许清除工作记忆条目，不修改权威 `messages`

### Requirement:上下文构建器支持上下文操作

上下文构建器 SHALL 在生成 `contextMessages` 时支持显式的保留、丢弃、注入和摘要操作。

#### Scenario:近期消息被保留

- **WHEN** 为模型调用构建上下文
- **THEN** 上下文构建器应在 `contextMessages` 中保留近期相关对话消息

#### Scenario:较旧消息可摘要

- **WHEN** 选择较旧的合格消息进行摘要
- **THEN** 上下文构建器应在 `contextMessages` 中用摘要消息替换它们
- **AND** 原始消息在权威 `messages` 中应保持不变

#### Scenario:上下文可从模型输入中丢弃

- **WHEN** 上下文策略将某消息或记忆条目标记为当前模型调用不需要
- **THEN** 上下文构建器应在 `contextMessages` 中省略它
- **AND** 被省略的项应保留在其原始存储中（若为权威历史或记忆）

### Requirement:摘要从简单开始

系统 SHALL 包含简单摘要模块，可将选定消息转换为简洁的模型可读摘要，无需额外模型调用。

#### Scenario:摘要确定性生成

- **WHEN** 上下文构建器请求摘要器摘要选定消息
- **THEN** 摘要器应基于这些消息返回确定性摘要消息
- **AND** 摘要消息应可在 `contextMessages` 中使用

#### Scenario:摘要器可后续替换

- **WHEN** 未来代码需要更丰富的摘要行为
- **THEN** 摘要模块应暴露聚焦接口，可替换而不改变 Provider 适配器实现
