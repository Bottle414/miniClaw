/**
 * DeepSeek Chat Completion API Types
 * @see https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
 */

// ============== Possible Values ==============

/** 模型 ID */
export type DeepSeekModelId = "deepseek-v4-flash" | "deepseek-v4-pro"

/** 思考模式类型 */
export type DeepSeekThinkingType = "enabled" | "disabled"

/** 推理强度 */
export type DeepSeekReasoningEffort = "high" | "max"

/** 响应格式类型 */
export type DeepSeekResponseFormatType = "text" | "json_object"

/** 工具类型 */
export type DeepSeekToolType = "function"

/** 工具选择 */
export type DeepSeekToolChoiceMode = "none" | "auto" | "required"

/** 停止原因 */
export type DeepSeekFinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "insufficient_system_resource"

/** 对话补全对象类型 */
export type DeepSeekChatCompletionObject = "chat.completion"

/** 流式对话补全对象类型 */
export type DeepSeekChatCompletionChunkObject = "chat.completion.chunk"

// ============== Message Types ==============

/** System 消息 */
export interface DeepSeekSystemMessage {
	content: string
	role: "system"
	name?: string
}

/** User 消息 */
export interface DeepSeekUserMessage {
	content: string
	role: "user"
	name?: string
}

/** Assistant 消息 */
export interface DeepSeekAssistantMessage {
	content?: string | null
	role: "assistant"
	name?: string
	prefix?: boolean
	reasoning_content?: string | null
	tool_calls?: DeepSeekToolCallResponse[]
}

/** Tool 消息 */
export interface DeepSeekToolMessage {
	role: "tool"
	content: string
	tool_call_id: string
}

/** 消息类型联合 */
export type DeepSeekMessage = DeepSeekSystemMessage | DeepSeekUserMessage | DeepSeekAssistantMessage | DeepSeekToolMessage

// ============== Request Types ==============

/** 思考配置 */
export interface DeepSeekThinkingConfig {
	type?: DeepSeekThinkingType
}

/** 响应格式 */
export interface DeepSeekResponseFormat {
	type?: DeepSeekResponseFormatType
}

/** 流式输出选项 */
export interface DeepSeekStreamOptions {
	include_usage?: boolean
}

/** 工具函数参数 */
export interface DeepSeekFunctionParameters {
	[property: string]: unknown
}

/** 工具函数定义 */
export interface DeepSeekFunctionDefinition {
	description?: string
	name: string
	parameters?: DeepSeekFunctionParameters
	strict?: boolean
}

/** 工具定义 */
export interface DeepSeekTool {
	type: DeepSeekToolType
	function: DeepSeekFunctionDefinition
}

/** 指定工具调用 */
export interface DeepSeekNamedToolChoice {
	type: "function"
	function: { name: string }
}

/** 工具选择类型 */
export type DeepSeekToolChoice = DeepSeekToolChoiceMode | DeepSeekNamedToolChoice

/** 对话补全请求 */
export interface DeepSeekChatCompletionRequest {
	messages: DeepSeekMessage[]
	model: DeepSeekModelId | string
	thinking?: DeepSeekThinkingConfig | null
	reasoning_effort?: DeepSeekReasoningEffort
	max_tokens?: number | null
	response_format?: DeepSeekResponseFormat | null
	stop?: string | string[] | null
	stream?: boolean | null
	stream_options?: DeepSeekStreamOptions | null
	temperature?: number | null
	top_p?: number | null
	tools?: DeepSeekTool[] | null
	tool_choice?: DeepSeekToolChoice | null
	logprobs?: boolean | null
	top_logprobs?: number | null
	user_id?: string | null
}

// ============== Response Types ==============

/** Token 对数概率信息 */
export interface DeepSeekTokenLogProb {
	token: string
	logprob: number
	bytes?: number[] | null
}

/** Token 对数概率信息 (包含 top_logprobs) */
export interface DeepSeekTokenLogProbWithTop extends DeepSeekTokenLogProb {
	top_logprobs: DeepSeekTokenLogProb[]
}

/** 对数概率信息 */
export interface DeepSeekLogProbs {
	content?: DeepSeekTokenLogProbWithTop[] | null
	reasoning_content?: DeepSeekTokenLogProbWithTop[] | null
}

/** 工具调用响应 */
export interface DeepSeekToolCallResponse {
	id: string
	type: "function"
	function: { name: string; arguments: string }
}

/** 响应消息 */
export interface DeepSeekChatCompletionMessage {
	content?: string | null
	reasoning_content?: string | null
	tool_calls?: DeepSeekToolCallResponse[]
	role: "assistant"
	logprobs?: DeepSeekLogProbs | null
}

/** 对话补全选择项 */
export interface DeepSeekChatCompletionChoice {
	finish_reason: DeepSeekFinishReason
	index: number
	message: DeepSeekChatCompletionMessage
}

/** Token 使用情况 */
export interface DeepSeekUsage {
	completion_tokens: number
	prompt_tokens: number
	prompt_cache_hit_tokens: number
	prompt_cache_miss_tokens: number
	total_tokens: number
	completion_tokens_details?: { reasoning_tokens: number }
}

/** 对话补全响应 */
export interface DeepSeekChatCompletionResponse {
	id: string
	choices: DeepSeekChatCompletionChoice[]
	created: number
	model: string
	system_fingerprint: string
	object: DeepSeekChatCompletionObject
	usage?: DeepSeekUsage
}

// ============== Streaming Response Types ==============

/** 流式增量消息 */
export interface DeepSeekChatCompletionDelta {
	content?: string | null
	reasoning_content?: string | null
	role?: "assistant"
	tool_calls?: DeepSeekToolCallResponse[]
}

/** 流式对话补全选择项 */
export interface DeepSeekChatCompletionChunkChoice {
	delta: DeepSeekChatCompletionDelta
	finish_reason: DeepSeekFinishReason | null
	index: number
}

/** 流式对话补全 chunk */
export interface DeepSeekChatCompletionChunk {
	id: string
	choices: DeepSeekChatCompletionChunkChoice[]
	created: number
	model: string
	system_fingerprint: string
	object: DeepSeekChatCompletionChunkObject
	usage?: DeepSeekUsage
}
