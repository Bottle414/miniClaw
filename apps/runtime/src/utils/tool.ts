import { toolHandler } from "../tools"
import { LLMToolCall } from "../types/llm"

export function useTool(tools: LLMToolCall[]) {
	return tools.map((tool) => {
		const { id, name, arguments: toolParams } = tool
		const result = toolHandler.call(name, JSON.parse(toolParams || "{}"))
		return {
			role: "tool",
			tool_call_id: id,
			content: result
		}
	})
}
