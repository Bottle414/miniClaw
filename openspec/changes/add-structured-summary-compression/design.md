## Context

miniClaw 已有基础 Context Builder 设计：权威 `messages` 保持完整，模型调用使用派生的 `contextMessages`。当前摘要器只是把旧消息确定性格式化/JSON 化为系统消息，虽然能提供摘要入口，但没有真正减少信息量，也没有把可复用事实结构化出来。

本变更在基础记忆系统之上继续演进：摘要压缩由当前 LLM 执行，但必须使用独立的“摘要生成器” system prompt，限制模型做提取式压缩而不是自由总结，避免漂移。摘要结果不再直接等同于 `LLMSystemMessage`，而是先产生结构化 `SummaryResult`，再由 Context Builder 渲染为最终项目上下文消息。

设计需遵守 miniClaw 项目规范：业务层使用统一 LLM 类型，不直接引用提供商原生类型；Provider/adaptor 继续只负责 API 与类型转换；runtime 使用 ESM；导出类型/函数添加 JSDoc；优先函数与闭包而非 class。

## Goals / Non-Goals

**Goals:**
- 使用当前配置的 LLM Provider 生成结构化压缩结果。
- 为内部摘要请求引入专用摘要生成器 system prompt，且该 prompt 不进入最终项目上下文。
- 定义 `Fact` 和 `SummaryResult` 数据结构，包含摘要文本、提取事实、来源范围和创建时间。
- 将 summarizer 职责限定为“压缩消息并返回结构化结果”。
- 将 Context Builder 职责限定为“选择上下文并渲染为 `[systemPrompt, summaryMessage, factMessage, ...recentMessages]`”。
- 保持 canonical `messages` 不变，仅改变模型面向上下文。

**Non-Goals:**
- 不引入跨进程持久化事实存储。
- 不引入向量检索、语义搜索或复杂 token 预算系统。
- 不把摘要生成器 prompt 作为用户项目上下文的一部分。
- 不改变 Provider/adaptor 的统一请求/响应边界。
- 不要求本变更解决所有摘要漂移问题；先通过提取式 prompt、结构化输出和校验降低风险。

## Decisions

1. **摘要请求复用当前 Provider，但作为内部请求隔离。**
   - Decision: Summarizer 接收 Provider/config 或可调用的 LLM 压缩函数，构造内部 `LLMRequest` 并调用当前 LLM。
   - Rationale: 避免新增依赖和第二套 LLM 客户端，保持与当前模型能力一致。
   - Alternative considered: 继续 deterministic summarizer。Rejected because it does not provide real compression or structured extraction.

2. **摘要生成器 prompt 不计入最终 contextMessages。**
   - Decision: `SUMMARY_GENERATOR_SYSTEM_PROMPT` 只用于内部摘要请求的 system message；Context Builder 不会把它注入用户任务的 `contextMessages`。
   - Rationale: 摘要生成指令属于内部处理策略，不应污染模型执行用户任务时看到的项目上下文。
   - Alternative considered: 把摘要 prompt 合并进最终 system prompt。Rejected because it changes model behavior for the actual task.

3. **Summarizer 返回 `SummaryResult`，不返回 `LLMSystemMessage`。**
   - Decision: `SummaryResult` 包含 `summary`、`extractedFacts`、`sourceRange`、`createdAt`，并保留后续扩展字段空间。
   - Rationale: 压缩结果是数据，不是最终渲染形态；Context Builder 才知道应该如何把数据注入模型上下文。
   - Alternative considered: 继续直接返回 summary message。Rejected because facts/source metadata would be lost or mixed into prompt text.

4. **Fact 使用明确分类。**
   - Decision: `Fact.category` 至少支持 `user-preference`、`task`、`constraint`、`project-state`，并允许后续扩展。
   - Rationale: 分类使 Context Builder 能把事实以稳定格式注入，也为后续过滤、保留、持久化提供基础。
   - Alternative considered: 只返回一个 summary string。Rejected because downstream cannot selectively preserve high-value facts.

5. **Context Builder 负责渲染顺序。**
   - Decision: Context Builder 输出顺序固定为 `[systemPrompt, summaryMessage, factMessage, ...recentMessages]`，其中没有内容的段落可省略但相对顺序保持。
   - Rationale: 让高层指令、压缩背景、事实和近期上下文的优先级清晰稳定。
   - Alternative considered: Summarizer 同时决定最终消息顺序。Rejected because it couples compression and context assembly.

6. **结构化输出需要解析与兜底。**
   - Decision: LLM 摘要响应必须按 JSON 结构解析；解析失败时返回明确错误或可配置回退到 deterministic summary。
   - Rationale: 内部摘要失败不应静默产生漂移内容。
   - Alternative considered: 直接信任自然语言输出。Rejected because it is hard to test and unsafe for context construction.

## Risks / Trade-offs

- LLM 摘要可能漂移或编造事实 → Mitigation: 使用提取式 system prompt，要求只从输入消息提取；输出结构中保留 sourceRange；测试覆盖 prompt 和解析行为。
- 内部摘要调用增加延迟和成本 → Mitigation: 只在超过压缩阈值时调用，后续可缓存 `SummaryResult`。
- 摘要请求递归触发 Context Builder → Mitigation: 摘要请求走独立内部路径，直接构造 request，不再对摘要请求本身做上下文压缩。
- JSON 解析失败导致模型调用中断 → Mitigation: 明确错误处理；实现可选 fallback，默认失败可观测。
- Fact 分类不够完整 → Mitigation: 初始分类覆盖当前需求，类型设计允许后续添加分类。

## Migration Plan

1. 新增 summary/fact 类型，并替换现有 summarizer 返回类型。
2. 新增摘要生成器 system prompt 文件或 prompt 导出。
3. 实现 LLM-based summarizer，包含请求构造、响应解析和错误处理。
4. 调整 Context Builder：接收 `SummaryResult`，渲染 summary/fact messages，并保持近期消息拼接。
5. 更新 runtime/ReAct 调用点，让 Context Builder 可异步构建 contextMessages。
6. 更新测试：结构化解析、prompt 隔离、sourceRange、fact 渲染、canonical messages 不变。

Rollback: 保留 `SummaryResult` 类型后，可临时切回 deterministic summarizer 生成结构化结果；Provider 调用仍可直接传近期消息。

## Open Questions

- `Fact.category` 是否需要开放 string 扩展，还是限定为严格 union？建议先 strict union 并集中维护。
- 摘要失败默认应该阻断模型调用还是回退到旧 deterministic summary？建议开发期阻断，后续再配置化。
- `sourceRange` 使用闭区间 `[start, end]` 还是半开区间 `[start, end)`？建议按用户描述采用闭区间，并在类型注释中明确。
