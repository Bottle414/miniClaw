# Provider 初始化规格

## Purpose

定义 LLM Provider 的初始化流程，包括配置注入、客户端创建和状态管理。

## Requirements

### Requirement: Provider init 方法接受配置

Provider SHALL 提供 `init(config: Config)` 方法，接受完整的配置对象。

#### Scenario: 使用有效配置初始化

- **WHEN** 使用包含 baseURL、apiKey、model 的有效 Config 对象调用 `init()`
- **THEN** Provider SHALL 在内部存储配置
- **AND** Provider SHALL 使用提供的 baseURL 和 apiKey 创建 OpenAI 客户端

#### Scenario: 缺少必要字段时初始化

- **WHEN** 使用缺少 apiKey 的 Config 对象调用 `init()`
- **THEN** Provider SHALL 抛出错误，提示缺少必要字段

### Requirement: Provider 维护内部状态

Provider SHALL 维护内部状态，包括 OpenAI 客户端实例和配置。

#### Scenario: 初始化后访问客户端

- **WHEN** `init()` 已成功调用
- **THEN** 后续对 `chat()` 的调用 SHALL 使用已存储的 OpenAI 客户端
- **AND** 客户端 SHALL 在 Provider 实例的整个生命周期内可访问

#### Scenario: 初始化前拒绝对话调用

- **WHEN** 在调用 `init()` 之前调用 `chat()`
- **THEN** Provider SHALL 抛出消息为 "Provider not initialized" 的错误

### Requirement: Provider 初始化是幂等的

Provider SHALL 支持多次调用 `init()` 以重新配置 Provider。

#### Scenario: 重新初始化 Provider

- **WHEN** 使用不同配置多次调用 `init()`
- **THEN** Provider SHALL 使用最新的配置
- **AND** 之前的 OpenAI 客户端 SHALL 被新客户端替换
