import { ToolMap } from "../const/tool"
import { ToolCalls } from "../types/tool"

export function useTool(tools: ToolCalls) {
	return tools.map((tool) => {
		console.log(tool)
		const { arguments: toolParams, name } = tool?.function || {}
		return ToolMap[name as keyof typeof ToolMap](JSON.parse(toolParams || "{}"))
	})
}
