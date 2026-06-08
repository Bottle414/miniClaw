/**
 * DeepSeek 适配器
 * 实现统一类型与 DeepSeek 类型之间的转换
 */

import type { LLMAdapter } from "../index"
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
	LLMChoice,
	LLMResponseMessage,
	LLMUsage,
	LLMToolCall,
	LLMFinishReason,
} from "../../llm"
import type {
	DeepSeekChatCompletionRequest,
	DeepSeekChatCompletionResponse,
	DeepSeekMessage,
	DeepSeekTool,
	DeepSeekToolChoice,
	DeepSeekThinkingConfig,
	DeepSeekReasoningEffort,
} from "./types"

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
			temperature: request.temperature ?? null,
			top_p: request.topP ?? null,
			max_tokens: request.maxTokens ?? null,
			stop: request.stop ?? null,
			stream: request.stream ?? null,
			stream_options: request.streamOptions
				? { include_usage: request.streamOptions.includeUsage }
				: null,
			response_format: request.responseFormat
				? { type: request.responseFormat.type }
				: null,
			tools: request.tools ? transformTools(request.tools) : null,
			tool_choice: request.toolChoice ? transformToolChoice(request.toolChoice) : null,
			logprobs: request.logprobs ?? null,
			top_logprobs: request.topLogprobs ?? null,
			user_id: request.userId ?? null,
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
			choices: response.choices.map(transformChoice),
			usage: response.usage ? transformUsage(response.usage) : undefined,
			systemFingerprint: response.system_fingerprint,
		}
	},
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
	return { role: "system", content: msg.content, name: msg.name }
}

function transformUserMessage(msg: LLMUserMessage): DeepSeekMessage {
	return { role: "user", content: msg.content, name: msg.name }
}

function transformAssistantMessage(msg: LLMAssistantMessage): DeepSeekMessage {
	return {
		role: "assistant",
		content: msg.content ?? null,
		name: msg.name,
		tool_calls: msg.toolCalls?.map(transformToolCall),
		reasoning_content: msg.reasoningContent ?? null,
	}
}

function transformToolMessage(msg: LLMToolMessage): DeepSeekMessage {
	return { role: "tool", content: msg.content, tool_call_id: msg.toolCallId }
}

function transformToolCall(tc: LLMToolCall): { id: string; type: "function"; function: { name: string; arguments: string } } {
	return {
		id: tc.id,
		type: "function",
		function: { name: tc.function.name, arguments: tc.function.arguments },
	}
}

/**
 * 转换工具列表
 */
function transformTools(tools: LLMTool[]): DeepSeekTool[] {
	return tools.map((tool) => ({
		type: "function",
		function: {
			name: tool.function.name,
			description: tool.function.description,
			parameters: tool.function.parameters as Record<string, unknown>,
			strict: tool.function.strict,
		},
	}))
}

/**
 * 转换工具选择
 */
function transformToolChoice(choice: LLMToolChoice): DeepSeekToolChoice {
	if (typeof choice === "string") {
		return choice
	}
	return { type: "function", function: { name: choice.function.name } }
}

/**
 * 转换响应选择项
 */
function transformChoice(choice: DeepSeekChatCompletionResponse["choices"][0]): LLMChoice {
	return {
		index: choice.index,
		finishReason: choice.finish_reason as LLMFinishReason,
		message: {
			role: "assistant",
			content: choice.message.content ?? null,
			toolCalls: choice.message.tool_calls?.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.function.name, arguments: tc.function.arguments },
			})),
			reasoningContent: choice.message.reasoning_content ?? undefined,
		},
	}
}

/**
 * 转换使用情况
 */
function transformUsage(usage: DeepSeekChatCompletionResponse["usage"]): LLMUsage {
	return {
		promptTokens: usage.prompt_tokens,
		completionTokens: usage.completion_tokens,
		totalTokens: usage.total_tokens,
		promptCacheHitTokens: usage.prompt_cache_hit_tokens,
		promptCacheMissTokens: usage.prompt_cache_miss_tokens,
		reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
	}
}

export default deepseekAdapter
