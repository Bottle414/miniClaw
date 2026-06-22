import type { LLMMessage } from "../types/llm"

/** 运行时记忆作用域。 */
export type MemoryScope = "session" | "working"

/** 结构化事实分类。 */
export type FactCategory = "user-preference" | "task" | "constraint" | "project-state"

/** 摘要结果来源消息范围，使用闭区间 `[start, end]`。 */
export type SummarySourceRange = [start: number, end: number]

/** 运行时记忆条目。 */
export interface MemoryEntry {
	id: string
	content: string
	scope: MemoryScope
	createdAt: number
	updatedAt: number
	active: boolean
	metadata?: Record<string, unknown>
}

/** 会话级长期上下文。 */
export interface SessionMemory {
	entries: MemoryEntry[]
}

/** 当前任务工作上下文。 */
export interface WorkingMemory {
	entries: MemoryEntry[]
}

/** 运行时记忆状态。 */
export interface RuntimeMemoryState {
	session: SessionMemory
	working: WorkingMemory
}

/** 从源消息中提取的可复用事实。 */
export interface Fact {
	/** 事实分类。 */
	category: FactCategory
	/** 事实内容，只能来自源消息。 */
	content: string
	/** 可选来源说明，例如消息索引或角色。 */
	source?: string
}

/** LLM 摘要器期望返回的 JSON 结构。 */
export interface SummaryJsonResponse {
	/** 提取式摘要文本。 */
	summary: string
	/** 结构化事实列表。 */
	extractedFacts: Fact[]
}

/** 结构化摘要压缩结果。 */
export interface SummaryResult {
	/** 提取式摘要文本。 */
	summary: string
	/** 从源消息中提取的结构化事实。 */
	extractedFacts: Fact[]
	/** 摘要覆盖的 canonical messages 闭区间。 */
	sourceRange: SummarySourceRange
	/** 摘要创建时间戳。 */
	createdAt: number
	/** 摘要器附加元数据。 */
	metadata?: Record<string, unknown>
}

/** Context Builder 配置。 */
export interface ContextBuilderOptions {
	/** 保留的最近消息数量 */
	preserveRecentMessages?: number
	/** 超出保留窗口的旧消息是否摘要 */
	summarizeOlderMessages?: boolean
	/** 注入会话记忆 */
	includeSessionMemory?: boolean
	/** 注入工作记忆 */
	includeWorkingMemory?: boolean
}

/** Context Builder 执行的操作记录。 */
export interface ContextBuildOperation {
	type: "preserve" | "discard" | "inject" | "summarize"
	source: "messages" | "session-memory" | "working-memory" | "summary"
	count: number
	description: string
}

/** Context Builder 输出。 */
export interface ContextBuildResult {
	contextMessages: LLMMessage[]
	operations: ContextBuildOperation[]
	/** 本次构建产生的摘要结果（如有），供调用者持久化。 */
	summaryResult?: SummaryResult
}

/** 摘要器接口，只负责压缩并返回结构化数据。 */
export interface Summarizer {
	summarize(messages: LLMMessage[], sourceRange: SummarySourceRange): Promise<SummaryResult | null>
}

/** Context Builder 输入。 */
export interface ContextBuilderInput {
	messages: LLMMessage[]
	memory: RuntimeMemoryState
	options?: ContextBuilderOptions
	summarizer?: Summarizer
}

/** Session 元数据。 */
export interface SessionMetadata {
	/** Session 唯一标识。 */
	id: string
	/** Session 名称，可由外部传入。 */
	name: string
	/** 创建时间，ISO 8601 字符串。 */
	createdAt: string
	/** 最后更新时间，ISO 8601 字符串。 */
	updatedAt: string
}

/** 思考过程条目，与 messages 一一对应，仅 assistant 消息有值。 */
export interface ReasoningEntry {
	/** 对应消息在 messages 数组中的索引。 */
	messageIndex: number
	/** 思考过程内容。 */
	reasoning: string
}

/** 持久化存储的 session 数据。 */
export interface SessionData {
	/** Session 元数据。 */
	metadata: SessionMetadata
	/** 完整对话历史。 */
	messages: LLMMessage[]
	/** 摘要结果列表。 */
	summary: SummaryResult[]
	/** 提取的事实列表。 */
	facts: Fact[]
	/** 思考过程列表，与 messages 一一对应，不注入上下文。 */
	reasoning: ReasoningEntry[]
}

/** 运行时 Session 对象。 */
export interface Session {
	/** Session 唯一标识。 */
	id: string
	/** Session 名称。 */
	name: string
	/** 创建时间，ISO 8601 字符串。 */
	createdAt: string
	/** 最后更新时间，ISO 8601 字符串。 */
	updatedAt: string
	/** 完整对话历史。 */
	messages: LLMMessage[]
	/** 摘要结果列表。 */
	summary: SummaryResult[]
	/** 提取的事实列表。 */
	facts: Fact[]
	/** 思考过程列表，与 messages 一一对应，不注入上下文。 */
	reasoning: ReasoningEntry[]
}

/** 持久化存储抽象接口。 */
export interface MemoryStore {
	/** 保存 session 数据。 */
	save(sessionId: string, data: SessionData): Promise<void>
	/** 加载 session 数据，不存在时返回 null。 */
	load(sessionId: string): Promise<SessionData | null>
	/** 删除 session 数据。 */
	delete(sessionId: string): Promise<void>
	/** 检查 session 是否存在。 */
	exists(sessionId: string): Promise<boolean>
	/** 列出所有 session 的元数据（可选）。 */
	list?: () => Promise<SessionMetadata[]>
}

/** SessionManager 创建选项。 */
export interface SessionCreateOptions {
	/** 外部传入的 session ID，用于加载已有 session。 */
	id?: string
	/** 外部传入的 session 名称。 */
	name?: string
}
