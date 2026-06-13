## Why

当前 Context Builder 已具备上下文构建入口，但摘要实现只是把消息确定性 JSON 化，不能真正压缩上下文，也无法稳定提取可复用事实。需要引入基于当前 LLM 的结构化摘要提取，让压缩结果可控、可审计，并与最终项目上下文注入职责分离。

## What Changes

- 引入结构化摘要压缩能力：将待压缩消息发送给当前 LLM，由专用“摘要生成器” system prompt 约束其只做提取式摘要，不做自由发挥。
- 新增摘要生成器 system prompt，该 prompt 仅用于摘要生成请求，不计入最终项目上下文。
- 将摘要器输出从直接 `LLMSystemMessage` 改为 `SummaryResult` 数据结构。
- 新增 `Fact` 类型，支持 `user-preference`、`task`、`constraint`、`project-state` 等分类和结构化内容。
- `SummaryResult` 包含 `summary: string`、`extractedFacts: Fact[]`、`sourceRange: [start: number, end: number]`、`createdAt: number` 等元数据。
- 调整职责边界：summarizer 只负责压缩并返回结构化结果；Context Builder 负责把 `SummaryResult` 渲染为 `[systemPrompt, summaryMessage, factMessage, ...recentMessages]`。
- 保留已有权威 `messages` 历史不变，只改变模型面向上下文的构建方式。

## Capabilities

### New Capabilities

- `structured-summary-compression`: 定义 LLM 驱动的提取式摘要压缩、结构化事实提取、摘要结果数据结构，以及 Context Builder 对摘要结果的上下文注入行为。

### Modified Capabilities

- `provider-chat`: 运行时内部摘要请求将复用当前 LLM Provider，但摘要生成器 system prompt 仅用于压缩请求，不进入最终项目上下文。

## Impact

- 受影响代码：运行时记忆/摘要器/上下文构建器模块、摘要提示词定义、内部摘要的 Provider 请求组装及相关测试。
- API/数据模型：摘要器输出契约从直接 `LLMSystemMessage` 替换为 `SummaryResult`；新增 `Fact` 及事实分类类型。
- 依赖：无需新增外部依赖；使用现有 Provider 和统一 LLM 类型。
- 系统：面向模型的上下文将由渲染后的摘要/事实消息加近期消息构建，权威 `messages` 保持不变。
