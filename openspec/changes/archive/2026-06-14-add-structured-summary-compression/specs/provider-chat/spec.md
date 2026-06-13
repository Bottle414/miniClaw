## MODIFIED Requirements

### Requirement: Provider chat 方法接受 LLM 请求

Provider SHALL 提供 `chat(req: LLMRequest): Promise<LLMResponse>` 方法，接受统一 LLM 请求类型。拥有权威对话历史和记忆状态访问权的运行时代码应在调用 Provider 前构建面向模型的 `contextMessages`，并将 `contextMessages` 作为 `req.messages` 传递。运行时代码 MAY 使用同一个 Provider 发起内部摘要请求，但该请求 SHALL 使用独立的摘要生成器 system prompt，并且 SHALL NOT 将该 prompt 注入最终任务 `contextMessages`。

#### Scenario: 发送对话请求

- **WHEN** 运行时代码从权威消息准备有效的 LLMRequest 用于 `chat()`
- **THEN** 运行时代码应在调用 Provider 前构建 `contextMessages`
- **AND** Provider SHALL 使用适配器转换请求
- **AND** Provider SHALL 调用 OpenAI 客户端 API
- **AND** Provider SHALL 返回解析为 LLMResponse 的 Promise

#### Scenario: 带工具的对话

- **WHEN** 使用包含 tools 的请求调用 `chat()`
- **THEN** Provider SHALL 使用适配器的 `transformTools()` 转换工具
- **AND** Provider SHALL 在 API 调用中包含转换后的工具

#### Scenario: 内部摘要请求

- **WHEN** 运行时代码需要压缩消息上下文
- **THEN** 运行时代码 MAY 使用当前 Provider 发送内部摘要 LLMRequest
- **AND** 内部摘要 LLMRequest SHALL 使用摘要生成器 system prompt
- **AND** 内部摘要 LLMRequest SHALL NOT 经过最终任务 Context Builder 递归构建
