## 修改需求

### 需求：Provider chat 方法接受 LLM 请求

Provider 应提供 `chat(req: LLMRequest): Promise<LLMResponse>` 并接受统一 LLM 请求类型。拥有权威对话历史和记忆状态访问权的运行时代码应在调用 Provider 前构建面向模型的 `contextMessages`，并将 `contextMessages` 作为 `req.messages` 传递。

#### 场景：发送对话请求

- **WHEN** 运行时代码从权威消息准备有效的 LLMRequest 用于 `chat()`
- **THEN** 运行时代码应在调用 Provider 前构建 `contextMessages`
- **AND** Provider 应使用请求消息通过适配器转换请求
- **AND** Provider 应调用 OpenAI 客户端 API
- **AND** Provider 应返回解析为 LLMResponse 的 Promise

#### 场景：带工具的对话

- **WHEN** 使用包含 tools 的请求调用 `chat()`
- **THEN** Provider 应使用适配器的 `transformTools()` 转换工具
- **AND** Provider 应在 API 调用中包含转换后的工具

### 需求：Provider 应在消息中保持 ReAct 上下文

Provider 应保留面向模型请求消息中存在的 ReAct 特定上下文，包括行动历史和观察。运行时 ReAct 编排应单独保留权威 ReAct 历史，并为每次 Provider 调用构建 `contextMessages`。

#### 场景：上下文保持

- **WHEN** Provider 处理带 ReAct 上下文的消息
- **THEN** Provider 应保留关于行动和观察的元数据
- **AND** Provider 应为 LLM 适当格式化上下文
- **AND** Provider 不应剥离相关的 ReAct 元数据

#### 场景：上下文窗口管理

- **WHEN** 运行时 ReAct 编排从大于期望模型面向上下文的消息历史准备 Provider 请求
- **THEN** 运行时代码应在调用 Provider 前使用上下文构建器构建 `contextMessages`
- **AND** 上下文构建器应优先保留近期消息和观察
- **AND** 上下文构建器可摘要较旧上下文
- **AND** Provider 应发送已构建的请求消息，不修改权威 ReAct 历史
