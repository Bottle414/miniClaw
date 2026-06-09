import { ToolMap } from "../tools"
import { LLMToolCall } from "../types/llm"

export function useTool(tools: LLMToolCall[]) {
	return tools.map((tool) => {
		console.log(tool)
		const { id, name, arguments: toolParams } = tool || {}
		const result = ToolMap[name as keyof typeof ToolMap](JSON.parse(toolParams || "{}"))
		return {
			role: "tool",
			tool_call_id: id || "",
			content: result
		}
	})
}
