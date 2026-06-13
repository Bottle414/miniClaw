import type { LLMMessage, LLMSystemMessage } from "../types/llm"
import { simpleSummarizer } from "./summarizer"
import type {
	ContextBuilderInput,
	ContextBuilderOptions,
	ContextBuildOperation,
	ContextBuildResult,
	MemoryEntry,
	RuntimeMemoryState
} from "./types"

const DEFAULT_OPTIONS: Required<ContextBuilderOptions> = {
	preserveRecentMessages: 12,
	summarizeOlderMessages: true,
	includeSessionMemory: true,
	includeWorkingMemory: true
}

function mergeOptions(options?: ContextBuilderOptions): Required<ContextBuilderOptions> {
	return { ...DEFAULT_OPTIONS, ...options }
}

function activeEntries(entries: MemoryEntry[]): MemoryEntry[] {
	return entries.filter((entry) => entry.active)
}

function buildMemoryMessage(
	title: string,
	entries: MemoryEntry[]
): LLMSystemMessage | null {
	if (entries.length === 0) return null

	return {
		role: "system",
		content: [
			title,
			...entries.map((entry) => `- (${entry.id}) ${entry.content}`)
		].join("\n")
	}
}

function pushMemoryContext(
	contextMessages: LLMMessage[],
	operations: ContextBuildOperation[],
	memory: RuntimeMemoryState,
	options: Required<ContextBuilderOptions>
): void {
	if (options.includeSessionMemory) {
		const entries = activeEntries(memory.session.entries)
		const message = buildMemoryMessage("会话记忆：", entries)
		if (message) {
			contextMessages.push(message)
			operations.push({
				type: "inject",
				source: "session-memory",
				count: entries.length,
				description: "注入会话记忆"
			})
		}
	}

	if (options.includeWorkingMemory) {
		const entries = activeEntries(memory.working.entries)
		const message = buildMemoryMessage("工作记忆：", entries)
		if (message) {
			contextMessages.push(message)
			operations.push({
				type: "inject",
				source: "working-memory",
				count: entries.length,
				description: "注入工作记忆"
			})
		}
	}
}

export function buildContext(input: ContextBuilderInput): ContextBuildResult {
	const options = mergeOptions(input.options)
	const summarizer = input.summarizer ?? simpleSummarizer
	const contextMessages: LLMMessage[] = []
	const operations: ContextBuildOperation[] = []

	pushMemoryContext(contextMessages, operations, input.memory, options)

	const preserveCount = Math.max(0, options.preserveRecentMessages)
	const splitIndex = Math.max(0, input.messages.length - preserveCount)
	const olderMessages = input.messages.slice(0, splitIndex)
	const recentMessages = input.messages.slice(splitIndex)

	if (olderMessages.length > 0) {
		if (options.summarizeOlderMessages) {
			const summaryMessage = summarizer.summarize(olderMessages)
			if (summaryMessage) {
				contextMessages.push(summaryMessage)
				operations.push({
					type: "summarize",
					source: "messages",
					count: olderMessages.length,
					description: "摘要较早消息"
				})
			}
		} else {
			operations.push({
				type: "discard",
				source: "messages",
				count: olderMessages.length,
				description: "从模型上下文丢弃较早消息"
			})
		}
	}

	contextMessages.push(...recentMessages)
	if (recentMessages.length > 0) {
		operations.push({
			type: "preserve",
			source: "messages",
			count: recentMessages.length,
			description: "保留最近消息"
		})
	}

	return { contextMessages, operations }
}
