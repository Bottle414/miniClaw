import { LLMToolCall } from "../types/llm"
import { parseToolCalls } from "../adaptor/deepseek"
import { useTool } from "./tool"

export function messageHandler(message: { tool_calls: any[] }) {
	if (message.tool_calls?.length) {
		const toolCalls: LLMToolCall[] = parseToolCalls(message.tool_calls)
		return useTool(toolCalls)
	}

	return []
}
