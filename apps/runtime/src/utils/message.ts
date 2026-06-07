import { ToolCalls } from "../types/message"
import { useTool } from "./tool"

export function messageHandler(message: { tool_calls: ToolCalls }) {
	if (message.tool_calls?.length) {
		const toolCalls = message.tool_calls || []
		return useTool(toolCalls)
	}

	return []
}
