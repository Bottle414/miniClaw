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
	LLMToolCall
} from "../../types/llm"
import type {
	DeepSeekChatCompletionRequest,
	DeepSeekChatCompletionResponse,
	DeepSeekAssistantMessage,
	DeepSeekMessage,
	DeepSeekTool,
	DeepSeekToolChoice,
	DeepSeekToolCallResponse
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
		const choice = response.choices[0]
		return {
			id: response.id,
			created: response.created,
			model: response.model,
			usage: response.usage ? transformUsage(response.usage) : undefined,
			message: choice
				? {
						content: choice.message.content ?? null,
						role: "assistant",
						toolCalls: choice.message.tool_calls ? parseToolCalls(choice.message.tool_calls) : undefined
					}
				: undefined
		}
	}
}

// ============== Internal Transformers ==============

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
	return { role: "system", content: msg.content }
}

function transformUserMessage(msg: LLMUserMessage): DeepSeekMessage {
	return { role: "user", content: msg.content }
}

function transformAssistantMessage(msg: LLMAssistantMessage): DeepSeekMessage {
	const result: DeepSeekAssistantMessage = {
		role: "assistant",
		content: msg.content ?? null
	}
	// 保留 tool_calls 以满足 API 要求：tool 消息前必须有带 tool_calls 的 assistant 消息
	if (msg.toolCalls && msg.toolCalls.length > 0) {
		result.tool_calls = msg.toolCalls.map(transformToolCall)
	}
	return result
}

function transformToolMessage(msg: LLMToolMessage): DeepSeekMessage {
	return { role: "tool", content: msg.content, tool_call_id: msg.toolCallId }
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
export function transformTools(tools: LLMTool[]): DeepSeekTool[] {
	return tools.map((tool) => ({
		type: "function",
		function: {
			name: tool.name.replace(/\./g, "-"),
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
 * 解析 DeepSeek 返回的 tool_calls 为内部 LLMToolCall 格式
 * DeepSeek 格式: { id, type, function: { name, arguments } }
 * 内部格式: { id, name, arguments }
 * 同时将工具名中的 "-" 还原为 "."（与 transformTools 中 "." → "-" 对应）
 */
export function parseToolCalls(toolCalls: DeepSeekToolCallResponse[]): LLMToolCall[] {
	return toolCalls.map((tc) => ({
		id: tc.id,
		name: tc.function.name.replace(/-/g, "."),
		arguments: tc.function.arguments
	}))
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
