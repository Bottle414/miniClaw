import type { LLMMessage, LLMSystemMessage } from "../types/llm"
import type { Summarizer } from "./types"

function messageToLine(message: LLMMessage, index: number): string {
	const label = `${index + 1}. ${message.role}`

	switch (message.role) {
		case "assistant":
			return `${label}: ${message.content ?? "(tool calls)"}`
		case "tool":
			return `${label}(${message.toolCallId}): ${message.content}`
		default:
			return `${label}: ${message.content}`
	}
}

export class SimpleSummarizer implements Summarizer {
	summarize(messages: LLMMessage[]): LLMSystemMessage | null {
		if (messages.length === 0) return null

		return {
			role: "system",
			content: [
				"以下是较早对话上下文的确定性摘要，原始消息仍保留在权威历史中：",
				...messages.map(messageToLine)
			].join("\n")
		}
	}
}

export const simpleSummarizer = new SimpleSummarizer()
