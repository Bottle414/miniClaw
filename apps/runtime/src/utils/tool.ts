import { ToolMap } from "../const/tool"
import { ToolCalls } from "../types/message"

export function useTool(tools: ToolCalls) {
	return tools.map((tool) => {
		console.log(tool)
		const { id } = tool || {}
		const { arguments: toolParams, name } = tool?.function || {}
		const result = ToolMap[name as keyof typeof ToolMap](JSON.parse(toolParams || "{}"))
		return {
			role: "tool",
			tool_call_id: id || "",
			content: result
		}
	})
}
