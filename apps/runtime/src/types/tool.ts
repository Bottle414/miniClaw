export interface ToolCall {
	type: "function"
	function: {
		name: string
		arguments: string
	}
}

export type ToolCalls = Array<ToolCall>
