## 1. 类型与提示词契约

- [x] 1.1 在运行时记忆/摘要区域新增 `FactCategory`、`Fact` 和 `SummaryResult` 类型，附带 JSDoc
- [x] 1.2 替换摘要器接口，使其返回 `SummaryResult` 而非 `LLMSystemMessage`
- [x] 1.3 新增专用摘要生成器系统提示词导出，指导仅提取的结构化摘要
- [x] 1.4 定义 LLM 摘要结果的预期 JSON 响应结构，保持与 Provider 原生类型无关

## 2. LLM 摘要生成

- [x] 2.1 实现基于 LLM 的摘要器，使用当前 Provider 和模型配置构建内部 `LLMRequest`
- [x] 2.2 确保内部摘要请求包含摘要生成器系统提示词和选定的源消息
- [x] 2.3 将 LLM 响应解析为 `SummaryResult`，包含 `sourceRange` 和 `createdAt`
- [x] 2.4 为格式错误的摘要 JSON 添加显式解析/校验错误
- [x] 2.5 防止摘要生成请求递归地经过最终任务的上下文构建器构建

## 3. 上下文构建器职责

- [x] 3.1 更新上下文构建器，消费 `SummaryResult` 并分别渲染 `summaryMessage` 和 `factMessage`
- [x] 3.2 更新上下文构建器输出顺序为 `[systemPrompt, summaryMessage, factMessage, ...recentMessages]`
- [x] 3.3 确保摘要生成器系统提示词不会出现在最终任务的 `contextMessages` 中
- [x] 3.4 在摘要生成和上下文渲染过程中保持权威 `messages` 不可变

## 4. 运行时集成

- [x] 4.1 更新旧版对话和流式路径，在需要摘要压缩时等待异步上下文构建
- [x] 4.2 更新 ReAct Act 阶段，等待异步上下文构建，同时保留完整 ReAct 状态消息
- [x] 4.3 保持 Provider/适配器边界不变，业务逻辑中仅使用统一 LLM 请求/响应/消息类型

## 5. 测试与验证

- [x] 5.1 添加单元测试：摘要 JSON 解析、提取的事实分类、源范围及格式错误响应
- [x] 5.2 添加测试：证明摘要生成器提示词仅用于内部摘要请求
- [x] 5.3 添加测试：证明上下文构建器按所需顺序渲染摘要和事实消息
- [x] 5.4 添加测试：证明权威 `messages` 不会被摘要压缩修改
- [x] 5.5 运行运行时构建、相关测试和 `openspec validate add-structured-summary-compression --strict`
