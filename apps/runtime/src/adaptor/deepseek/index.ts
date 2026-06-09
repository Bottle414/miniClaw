/**
 * DeepSeek 适配器
 * 实现统一类型与 DeepSeek 类型之间的转换
 */

import type { LLMAdapter } from "../../types/providers"
import type {
	LLMRequest,
	LLMResponse,
	LLMMessage,
	LLMSystemMessage,
	LLMUserMessage,
	LLMAssistantMessage,
	LLMToolMessage,
	LLMTool,
	LLMToolChoice,
	LLMUsage,
	LLMToolCall,
	Segment
} from "../../types/llm"
import type {
	DeepSeekChatCompletionRequest,
	DeepSeekChatCompletionResponse,
	DeepSeekMessage,
	DeepSeekTool,
	DeepSeekToolChoice
} from "../../types/providers/deepseek"

/**
 * DeepSeek 适配器实现
 */
export const deepseekAdapter: LLMAdapter<DeepSeekChatCompletionRequest, DeepSeekChatCompletionResponse> = {
	name: "deepseek",

	/**
	 * 将统一请求转换为 DeepSeek 请求
	 */
	transformRequest(request: LLMRequest): DeepSeekChatCompletionRequest {
		return {
			messages: transformMessages(request.messages),
			model: request.model,
			stream: request.stream ?? null,
			tools: request.tools ? transformTools(request.tools) : null,
			tool_choice: request.toolChoice ? transformToolChoice(request.toolChoice) : null
		}
	},

	/**
	 * 将 DeepSeek 响应转换为统一响应
	 */
	transformResponse(response: DeepSeekChatCompletionResponse): LLMResponse {
		return {
			id: response.id,
			created: response.created,
			model: response.model,
			usage: response.usage ? transformUsage(response.usage) : undefined
		}
	}
}

// ============== Internal Transformers ==============

/**
 * 将 Segment[] 转换为字符串
 */
function segmentsToString(segments: Segment[]): string {
	return segments.map((s) => s.text).join("")
}

/**
 * 转换消息列表
 */
function transformMessages(messages: LLMMessage[]): DeepSeekMessage[] {
	return messages.map((msg) => {
		switch (msg.role) {
			case "system":
				return transformSystemMessage(msg)
			case "user":
				return transformUserMessage(msg)
			case "assistant":
				return transformAssistantMessage(msg)
			case "tool":
				return transformToolMessage(msg)
		}
	})
}

function transformSystemMessage(msg: LLMSystemMessage): DeepSeekMessage {
	return { role: "system", content: segmentsToString(msg.content) }
}

function transformUserMessage(msg: LLMUserMessage): DeepSeekMessage {
	return { role: "user", content: segmentsToString(msg.content) }
}

function transformAssistantMessage(msg: LLMAssistantMessage): DeepSeekMessage {
	const result: DeepSeekMessage = {
		role: "assistant",
		content: msg.content ? segmentsToString(msg.content) : null
		/**
         * content 里面包含了 tool_calls，类似
         * {
            index: 0,
            id: 'call_00_24UehuNz54TRQn87krzP5930',
            type: 'function',
            function: { name: 'get_weather', arguments: '{"city": "上海"}' }
            }
            考虑读取到就存入历史消息，不再转为 deepseek 格式
         */
	}
	return result
}

function transformToolMessage(msg: LLMToolMessage): DeepSeekMessage {
	return { role: "tool", content: segmentsToString(msg.content), tool_call_id: msg.toolCallId }
}

/**
 * 转换工具调用
 * 统一格式: { id, name, arguments } -> DeepSeek 格式: { id, type: "function", function: { name, arguments } }
 */
function transformToolCall(tc: LLMToolCall): { id: string; type: "function"; function: { name: string; arguments: string } } {
	return {
		id: tc.id,
		type: "function",
		function: { name: tc.name, arguments: tc.arguments }
	}
}

/**
 * 转换工具列表
 * 统一格式: { name, description, parameters? } -> DeepSeek 格式: { type: "function", function: { name, description, parameters? } }
 */
function transformTools(tools: LLMTool[]): DeepSeekTool[] {
	return tools.map((tool) => ({
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters as Record<string, unknown>
		}
	}))
}

/**
 * 转换工具选择
 */
function transformToolChoice(choice: LLMToolChoice): DeepSeekToolChoice {
	if (typeof choice === "string") {
		return choice as DeepSeekToolChoice
	}
	return { type: "function", function: { name: choice.function.name } }
}

/**
 * 转换使用情况
 */
function transformUsage(usage: NonNullable<DeepSeekChatCompletionResponse["usage"]>): LLMUsage {
	return {
		promptTokens: usage.prompt_tokens,
		completionTokens: usage.completion_tokens,
		totalTokens: usage.total_tokens
	}
}

export default deepseekAdapter
