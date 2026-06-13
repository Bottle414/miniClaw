import type { LLMMessage, LLMSystemMessage } from "../types/llm"

export type MemoryScope = "session" | "working"

export interface MemoryEntry {
	id: string
	content: string
	scope: MemoryScope
	createdAt: number
	updatedAt: number
	active: boolean
	metadata?: Record<string, unknown>
}

export interface SessionMemory {
	entries: MemoryEntry[]
}

export interface WorkingMemory {
	entries: MemoryEntry[]
}

export interface RuntimeMemoryState {
	session: SessionMemory
	working: WorkingMemory
}

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

export interface ContextBuildOperation {
	type: "preserve" | "discard" | "inject" | "summarize"
	source: "messages" | "session-memory" | "working-memory" | "summary"
	count: number
	description: string
}

export interface ContextBuildResult {
	contextMessages: LLMMessage[]
	operations: ContextBuildOperation[]
}

export interface Summarizer {
	summarize(messages: LLMMessage[]): LLMSystemMessage | null
}

export interface ContextBuilderInput {
	messages: LLMMessage[]
	memory: RuntimeMemoryState
	options?: ContextBuilderOptions
	summarizer?: Summarizer
}
