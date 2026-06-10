## 新增需求

### 需求：Provider SHALL 支持 ReAct 特定的系统提示

Provider SHALL 支持 ReAct 特定的系统提示，指示 LLM 遵循 Think-Act-Observe 模式。系统提示 SHALL 可配置，可包含推理和工具使用说明。

#### 场景：ReAct 系统提示注入
- **WHEN** ReAct 循环初始化请求
- **THEN** Provider SHALL 接受 ReAct 特定的系统提示
- **AND** Provider SHALL 在消息数组中包含系统提示
- **AND** Provider SHALL 按消息格式要求格式化系统提示

#### 场景：ReAct 提示自定义
- **WHEN** 开发者提供自定义 ReAct 系统提示
- **THEN** Provider SHALL 使用自定义提示
- **AND** Provider SHALL 不用默认提示覆盖自定义提示

### 需求：Provider SHALL 解析 LLM 响应以识别 ReAct 阶段

Provider SHALL 支持解析 LLM 响应以提取思考过程、工具调用和最终答案。解析逻辑 SHALL 区分思考内容和最终答案内容。

#### 场景：带工具调用的响应
- **WHEN** LLM 响应包含工具调用
- **THEN** Provider SHALL 将此识别为 Act 阶段响应
- **AND** Provider SHALL 在响应中返回工具调用
- **AND** Provider SHALL 将响应标记为需要观察

#### 场景：带最终答案的响应
- **WHEN** LLM 响应包含内容但无工具调用
- **THEN** Provider SHALL 将此识别为最终答案
- **AND** Provider SHALL 在响应中返回内容
- **AND** Provider SHALL 不将响应标记为需要工具执行

#### 场景：同时包含内容和工具调用的响应
- **WHEN** LLM 响应同时包含内容和工具调用
- **THEN** Provider SHALL 在响应中包含两者
- **AND** Provider SHALL 优先处理工具调用用于 Act 阶段
- **AND** Provider SHALL 将内容作为推理上下文包含

### 需求：Provider SHALL 支持阶段特定的请求选项

Provider SHALL 支持 LLMRequest 中可选的阶段特定配置。这 SHALL 允许不同 ReAct 阶段使用不同的模型参数或提示。

#### 场景：Think 阶段请求
- **WHEN** ReAct 循环在 Think 阶段发起请求
- **THEN** Provider SHALL 接受请求中的阶段元数据
- **AND** Provider 可在配置时应用阶段特定的提示

#### 场景：Act 阶段请求
- **WHEN** ReAct 循环在 Act 阶段发起请求
- **THEN** Provider SHALL 接受请求中的阶段元数据
- **AND** Provider SHALL 在请求中包含工具定义

### 需求：Provider SHALL 在消息中保持 ReAct 上下文

Provider SHALL 确保消息历史维护 ReAct 特定的上下文，包括行动历史和观察结果。此上下文 SHALL 格式化以供 LLM 使用。

#### 场景：上下文保持
- **WHEN** Provider 处理带 ReAct 上下文的消息
- **THEN** Provider SHALL 保留关于行动和观察的元数据
- **AND** Provider SHALL 为 LLM 适当格式化上下文
- **AND** Provider SHALL 不剥离相关的 ReAct 元数据

#### 场景：上下文窗口管理
- **WHEN** 消息历史超出上下文窗口限制
- **THEN** Provider SHALL 应用截断策略
- **AND** Provider SHALL 优先保留近期消息和观察
- **AND** Provider 可在配置时摘要较旧的上下文
