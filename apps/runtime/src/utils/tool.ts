import { toolHandler } from "../tools"
import { LLMToolCall, LLMToolMessage } from "../types/llm"

export function useTool(tools: LLMToolCall[]): LLMToolMessage[] {
	return tools.map((tool) => {
		const { id, name, arguments: toolParams } = tool
		const result = toolHandler.call(name, JSON.parse(toolParams || "{}"))
		return {
			role: "tool",
			toolCallId: id,
			content: result
		}
	})
}
