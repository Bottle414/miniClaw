import { LLMToolCall, LLMAssistantMessage } from "../types/llm"
import type { RuntimeEvent } from "../types/event"

/**
 * 将 RuntimeEvent 序列合并为完整的 LLMAssistantMessage
 * 仅在收到 finish 事件后返回完整消息，否则返回 null
 */
export function mergeStreamMessage(events: RuntimeEvent[]): LLMAssistantMessage | null {
	let content = ""
	const toolCallMap = new Map<string, { name: string; arguments: string }>()
	let finished = false

	for (const event of events) {
		switch (event.type) {
			case "text-delta":
				content += event.delta
				break
			case "tool-call-start":
				toolCallMap.set(event.toolCallId, { name: event.toolName, arguments: "" })
				break
			case "tool-call-delta":
				{
					const tc = toolCallMap.get(event.toolCallId)
					if (tc) tc.arguments += event.argumentsDelta
				}
				break
			case "tool-call-end":
				{
					const tc = toolCallMap.get(event.toolCallId)
					if (tc) tc.arguments = event.arguments
				}
				break
			case "finish":
				finished = true
				break
			// tool-result 和 error 不属于 LLM 消息，跳过
		}
	}

	if (!finished) return null

	const toolCalls: LLMToolCall[] = []
	for (const [id, tc] of toolCallMap) {
		toolCalls.push({ id, name: tc.name, arguments: tc.arguments })
	}

	return {
		role: "assistant",
		content: content || null,
		toolCalls: toolCalls.length > 0 ? toolCalls : undefined
	}
}

/**
 * 创建增量流式合并器
 * 逐事件推送，finish 后可获取完整 LLMAssistantMessage
 */
export function createStreamMerger() {
	let content = ""
	const toolCallMap = new Map<string, { name: string; arguments: string }>()
	let finished = false

	return {
		/** 推送一个 RuntimeEvent */
		push(event: RuntimeEvent): void {
			switch (event.type) {
				case "text-delta":
					content += event.delta
					break
				case "tool-call-start":
					toolCallMap.set(event.toolCallId, { name: event.toolName, arguments: "" })
					break
				case "tool-call-delta":
					{
						const tc = toolCallMap.get(event.toolCallId)
						if (tc) tc.arguments += event.argumentsDelta
					}
					break
				case "tool-call-end":
					{
						const tc = toolCallMap.get(event.toolCallId)
						if (tc) tc.arguments = event.arguments
					}
					break
				case "finish":
					finished = true
					break
			}
		},

		/** 获取合并后的完整消息，未完成时返回 null */
		getMessage(): LLMAssistantMessage | null {
			if (!finished) return null

			const toolCalls: LLMToolCall[] = []
			for (const [id, tc] of toolCallMap) {
				toolCalls.push({ id, name: tc.name, arguments: tc.arguments })
			}

			return {
				role: "assistant",
				content: content || null,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined
			}
		}
	}
}
