# Provider 对话规格

## Purpose

定义 Provider 的聊天功能，包括请求处理、类型转换和错误处理。

## Requirements

### Requirement: Provider chat 方法接受 LLM 请求

Provider SHALL 提供 `chat(req: LLMRequest): Promise<LLMResponse>` 方法，接受统一 LLM 请求类型。

#### Scenario: 发送对话请求

- **WHEN** 使用包含 messages 和 model 的有效 LLMRequest 调用 `chat()`
- **THEN** Provider SHALL 使用适配器转换请求
- **AND** Provider SHALL 调用 OpenAI 客户端 API
- **AND** Provider SHALL 返回解析为 LLMResponse 的 Promise

#### Scenario: 带工具的对话

- **WHEN** 使用包含 tools 的请求调用 `chat()`
- **THEN** Provider SHALL 使用适配器的 `transformTools()` 转换工具
- **AND** Provider SHALL 在 API 调用中包含转换后的工具

### Requirement: Provider 集成适配器进行类型转换

Provider SHALL 使用适配器层在统一类型和提供商特定类型之间进行转换。

#### Scenario: 请求转换

- **WHEN** 准备调用 OpenAI API
- **THEN** Provider SHALL 使用 LLMRequest 调用 `adaptor.transformRequest()`
- **AND** 结果 SHALL 为 DeepSeek 兼容的请求对象

#### Scenario: 响应转换

- **WHEN** 收到 OpenAI API 的响应
- **THEN** Provider SHALL 使用 DeepSeek 响应调用 `adaptor.transformResponse()`
- **AND** 结果 SHALL 为 LLMResponse 对象

### Requirement: Provider 处理 API 错误

Provider SHALL 处理底层 API 客户端的错误。

#### Scenario: API 认证错误

- **WHEN** API 返回 401 认证错误
- **THEN** Provider SHALL 抛出包含明确认证失败信息的错误

#### Scenario: API 速率限制错误

- **WHEN** API 返回 429 速率限制错误
- **THEN** Provider SHALL 抛出指示速率限制已超出的错误

#### Scenario: 网络错误

- **WHEN** API 调用因网络问题失败
- **THEN** Provider SHALL 抛出包含网络错误详情的错误

### Requirement: Provider 返回结构化响应

Provider SHALL 返回包含消息内容和元数据的结构化 LLMResponse。

#### Scenario: 成功的对话响应

- **WHEN** 对话请求成功完成
- **THEN** LLMResponse SHALL 包含 id、created 时间戳和 model
- **AND** 响应 SHALL 可选包含 usage 统计信息
