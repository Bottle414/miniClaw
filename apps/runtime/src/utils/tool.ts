import { toolHandler } from "../tools"
import { LLMToolCall, LLMToolMessage } from "../types/llm"

export async function useTool(tools: LLMToolCall[], sessionId?: string): Promise<LLMToolMessage[]> {
	const results = await Promise.all(
		tools.map(async (tool) => {
			const { id, name, arguments: toolParams } = tool
			const result = await toolHandler.call(name, JSON.parse(toolParams || "{}"), sessionId)
			return {
				role: "tool" as const,
				toolCallId: id,
				content: result.error ? `Error: ${result.error.message}` : result.content
			}
		})
	)
	return results
}
