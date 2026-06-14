# Provider 对话规格

## Purpose

定义 Provider 的聊天功能，包括请求处理、类型转换和错误处理。

## Requirements

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

#### Scenario: 流式对话请求
- **WHEN** 使用包含 messages 和 model 的有效 LLMRequest 调用 `chatStream()`
- **THEN** Provider SHALL 使用适配器转换请求并设置 `stream: true`
- **AND** Provider SHALL 调用 OpenAI 客户端的流式 API
- **AND** Provider SHALL 返回 `AsyncIterable<RuntimeEvent>`

#### Scenario: 流式 chunk 转换
- **WHEN** Provider 收到流式 SSE chunk
- **THEN** Provider SHALL 使用适配器的 `transformStreamChunk()` 转换每个 chunk
- **AND** Provider SHALL 跳过返回 `null` 的 chunk

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

#### Scenario: 流式 chunk 转换
- **WHEN** 收到流式 SSE chunk
- **THEN** Provider SHALL 使用 `adaptor.transformStreamChunk()` 转换 chunk
- **AND** 结果 SHALL 为 RuntimeEvent 或 null

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

#### Scenario: 流式错误
- **WHEN** 流式处理过程中发生错误
- **THEN** Provider SHALL 发出 `{ type: 'error', error }` RuntimeEvent
- **AND** Provider SHALL 结束迭代

### Requirement: Provider 返回结构化响应

Provider SHALL 返回包含消息内容和元数据的结构化 LLMResponse。

#### Scenario: 成功的对话响应

- **WHEN** 对话请求成功完成
- **THEN** LLMResponse SHALL 包含 id、created 时间戳和 model
- **AND** 响应 SHALL 可选包含 usage 统计信息

### Requirement: Provider SHALL 支持 ReAct 特定的系统提示

Provider SHALL 支持 ReAct 特定的系统提示，指示 LLM 遵循 Think-Act-Observe 模式。系统提示 SHALL 可配置，可包含推理和工具使用说明。

#### Scenario: ReAct 系统提示注入
- **WHEN** ReAct 循环初始化请求
- **THEN** Provider SHALL 接受 ReAct 特定的系统提示
- **AND** Provider SHALL 在消息数组中包含系统提示
- **AND** Provider SHALL 按消息格式要求格式化系统提示

#### Scenario: ReAct 提示自定义
- **WHEN** 开发者提供自定义 ReAct 系统提示
- **THEN** Provider SHALL 使用自定义提示
- **AND** Provider SHALL 不用默认提示覆盖自定义提示

### Requirement: Provider SHALL 解析 LLM 响应以识别 ReAct 阶段

Provider SHALL 支持解析 LLM 响应以提取思考过程、工具调用和最终答案。解析逻辑 SHALL 区分思考内容和最终答案内容。

#### Scenario: 带工具调用的响应
- **WHEN** LLM 响应包含工具调用
- **THEN** Provider SHALL 将此识别为 Act 阶段响应
- **AND** Provider SHALL 在响应中返回工具调用
- **AND** Provider SHALL 将响应标记为需要观察

#### Scenario: 带最终答案的响应
- **WHEN** LLM 响应包含内容但无工具调用
- **THEN** Provider SHALL 将此识别为最终答案
- **AND** Provider SHALL 在响应中返回内容
- **AND** Provider SHALL 不将响应标记为需要工具执行

#### Scenario: 同时包含内容和工具调用的响应
- **WHEN** LLM 响应同时包含内容和工具调用
- **THEN** Provider SHALL 在响应中包含两者
- **AND** Provider SHALL 优先处理工具调用用于 Act 阶段
- **AND** Provider SHALL 将内容作为推理上下文包含

### Requirement: Provider SHALL 支持阶段特定的请求选项

Provider SHALL 支持 LLMRequest 中可选的阶段特定配置。这 SHALL 允许不同 ReAct 阶段使用不同的模型参数或提示。

#### Scenario: Think 阶段请求
- **WHEN** ReAct 循环在 Think 阶段发起请求
- **THEN** Provider SHALL 接受请求中的阶段元数据
- **AND** Provider 可在配置时应用阶段特定的提示

#### Scenario: Act 阶段请求
- **WHEN** ReAct 循环在 Act 阶段发起请求
- **THEN** Provider SHALL 接受请求中的阶段元数据
- **AND** Provider SHALL 在请求中包含工具定义

### Requirement: Provider SHALL 在消息中保持 ReAct 上下文

Provider SHALL 保留面向模型请求消息中存在的 ReAct 特定上下文，包括行动历史和观察。运行时 ReAct 编排应单独保留权威 ReAct 历史，并为每次 Provider 调用构建 `contextMessages`。

#### Scenario: 上下文保持
- **WHEN** Provider 处理带 ReAct 上下文的消息
- **THEN** Provider SHALL 保留关于行动和观察的元数据
- **AND** Provider SHALL 为 LLM 适当格式化上下文
- **AND** Provider SHALL 不剥离相关的 ReAct 元数据

#### Scenario: 上下文窗口管理
- **WHEN** 运行时 ReAct 编排从大于期望模型面向上下文的消息历史准备 Provider 请求
- **THEN** 运行时代码应在调用 Provider 前使用上下文构建器构建 `contextMessages`
- **AND** 上下文构建器应优先保留近期消息和观察
- **AND** 上下文构建器可摘要较旧上下文
- **AND** Provider SHALL 发送已构建的请求消息，不修改权威 ReAct 历史
