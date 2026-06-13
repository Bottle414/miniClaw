# 结构化摘要压缩规格

## Purpose

定义基于 LLM 的提取式摘要压缩、结构化事实提取、摘要结果数据结构，以及 Context Builder 对摘要结果的上下文注入行为。

## Requirements

### Requirement: LLM 生成结构化摘要结果
系统 SHALL 使用当前配置的 LLM 对被压缩消息执行提取式摘要，并返回结构化 `SummaryResult`，而不是直接返回 `LLMSystemMessage`。

#### Scenario: 生成结构化摘要
- **WHEN** 消息范围被选中进行压缩
- **THEN** 系统 SHALL 使用当前 LLM 生成 `SummaryResult`
- **AND** `SummaryResult` SHALL 包含 `summary`、`extractedFacts`、`sourceRange` 和 `createdAt`
- **AND** canonical `messages` SHALL 保持不变

#### Scenario: 摘要不直接作为最终消息返回
- **WHEN** summarizer 完成压缩
- **THEN** summarizer SHALL 返回结构化数据
- **AND** summarizer SHALL NOT 直接决定最终 `contextMessages` 中的 `LLMSystemMessage` 列表

### Requirement: 摘要生成器使用专用 System Prompt
系统 SHALL 为内部摘要请求使用专用摘要生成器 system prompt，该 prompt 只约束摘要生成任务，不进入最终项目上下文。

#### Scenario: 内部摘要请求包含专用 prompt
- **WHEN** 系统调用 LLM 生成摘要
- **THEN** 摘要请求 SHALL 包含摘要生成器 system prompt
- **AND** 该 prompt SHALL 要求模型只从输入消息提取信息，不自由总结或编造事实

#### Scenario: 摘要 prompt 不污染项目上下文
- **WHEN** Context Builder 构建最终发送给任务模型的 `contextMessages`
- **THEN** `contextMessages` SHALL NOT 包含摘要生成器 system prompt
- **AND** `contextMessages` SHALL 只包含任务执行所需的系统提示、摘要消息、事实消息和近期消息

### Requirement: Fact 结构化表达提取信息
系统 SHALL 定义 `Fact` 数据结构，用于表达从摘要来源消息中提取的可复用事实。

#### Scenario: 事实包含分类和内容
- **WHEN** LLM 摘要器提取事实
- **THEN** 每个 Fact SHALL 至少包含 `category` 和 `content`
- **AND** `category` SHALL 支持 `user-preference`、`task`、`constraint` 和 `project-state`

#### Scenario: 事实来源于输入消息
- **WHEN** LLM 摘要器返回 `extractedFacts`
- **THEN** 每条 fact SHALL 只描述输入消息中能支持的信息
- **AND** fact SHALL NOT 包含无法从输入消息推导的新增结论

### Requirement: SummaryResult 记录来源范围和时间
系统 SHALL 在 `SummaryResult` 中记录摘要覆盖的来源消息范围和摘要创建时间。

#### Scenario: 来源范围被记录
- **WHEN** 系统压缩 canonical messages 的一段连续范围
- **THEN** `SummaryResult.sourceRange` SHALL 记录该范围的起止消息索引
- **AND** 该范围 SHALL 对应被摘要器压缩的消息

#### Scenario: 创建时间被记录
- **WHEN** `SummaryResult` 被创建
- **THEN** `SummaryResult.createdAt` SHALL 记录创建时间戳

### Requirement: Context Builder 渲染摘要结果
Context Builder SHALL 负责把结构化摘要结果渲染为最终模型上下文消息，并保持稳定顺序。

#### Scenario: 渲染顺序稳定
- **WHEN** Context Builder 构建 `contextMessages`
- **THEN** 输出顺序 SHALL 为 `[systemPrompt, summaryMessage, factMessage, ...recentMessages]`
- **AND** 没有内容的段落 MAY 被省略但相对顺序 SHALL 保持不变

#### Scenario: 摘要消息和事实消息分离
- **WHEN** `SummaryResult` 同时包含 `summary` 和 `extractedFacts`
- **THEN** Context Builder SHALL 将 summary 渲染到 summaryMessage
- **AND** Context Builder SHALL 将 extractedFacts 渲染到 factMessage
- **AND** summarizer SHALL NOT 承担消息渲染职责

### Requirement: 摘要输出解析失败可观测
系统 SHALL 对 LLM 摘要输出进行结构化解析，并在解析失败时提供可观测错误。

#### Scenario: 摘要 JSON 解析成功
- **WHEN** LLM 返回符合摘要 schema 的内容
- **THEN** 系统 SHALL 解析为 `SummaryResult`
- **AND** 系统 SHALL 使用解析后的结构化字段构建上下文

#### Scenario: 摘要 JSON 解析失败
- **WHEN** LLM 返回内容无法解析为合法摘要结果
- **THEN** 系统 SHALL 抛出或返回明确摘要解析错误
- **AND** 系统 SHALL NOT 静默使用未校验的自然语言作为结构化摘要
