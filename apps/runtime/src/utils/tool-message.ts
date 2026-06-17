import type { ToolHandler } from "../tools"
import type { LLMToolCall } from "../types/llm"
import { parseToolCalls } from "../adaptor/deepseek"
import { useTool } from "./tool"

export async function createToolMessagesFromProviderCalls(toolHandler: ToolHandler, message: { tool_calls: any[] }, sessionId?: string) {
	if (message.tool_calls?.length) {
		const toolCalls: LLMToolCall[] = parseToolCalls(message.tool_calls)
		return useTool(toolHandler, toolCalls, sessionId)
	}

	return []
}
