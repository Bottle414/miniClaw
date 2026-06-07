export type MessageType = "function"

/**
 * 工具调用
 */
export interface ToolCall {
	index: number
	id: string
	type: "function"
	function: {
		name: string
		arguments: string
	}
}

export type ToolCalls = Array<ToolCall>

export interface ToolCallResult {
	role: "tool"
	tool_call_id: string
	content: string
}
