/**
 * DeepSeek Chat Completion API Types
 * @see https://api-docs.deepseek.com/zh-cn/api/create-chat-completion
 *
 * @deprecated 此文件已废弃，请使用 `./llm/` 下的统一类型和 `./providers/deepseek/` 下的适配器。
 * 迁移指南:
 * - ChatCompletionRequest → LLMRequest (from "./llm")
 * - ChatCompletionResponse → LLMResponse (from "./llm")
 * - 消息类型 → LLMSystemMessage, LLMUserMessage, LLMAssistantMessage, LLMToolMessage (from "./llm")
 */

// ============== Possible Values ==============

/** 模型 ID */
export type ModelId = "deepseek-v4-flash" | "deepseek-v4-pro"

/** 思考模式类型 */
export type ThinkingType = "enabled" | "disabled"

/** 推理强度 */
export type ReasoningEffort = "high" | "max"

/** 响应格式类型 */
export type ResponseFormatType = "text" | "json_object"

/** 工具类型 */
export type ToolType = "function"

/** 工具选择 */
export type ChatCompletionToolChoice = "none" | "auto" | "required"

/** 模型停止生成 token 的原因 */
export type FinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "insufficient_system_resource"

/** 对话补全对象类型 */
export type ChatCompletionObject = "chat.completion"

// ============== Message Types ==============

/**
 * System 消息
 */
export interface SystemMessage {
	/** system 消息的内容 */
	content: string
	/** 该消息的发起角色 */
	role: "system"
	/** 可以选填的参与者的名称 */
	name?: string
}

/**
 * User 消息
 */
export interface UserMessage {
	/** user 消息的内容 */
	content: string
	/** 该消息的发起角色 */
	role: "user"
	/** 可以选填的参与者的名称 */
	name?: string
}

/**
 * Assistant 消息
 */
export interface AssistantMessage {
	/** assistant 消息的内容 */
	content?: string | null
	/** 该消息的发起角色 */
	role: "assistant"
	/** 可以选填的参与者的名称 */
	name?: string
	/** (Beta) 设置为 true 来强制模型以此前缀内容开始回答 */
	prefix?: boolean
	/** (Beta) 用于思考模式下对话前缀续写功能，prefix 必须为 true */
	reasoning_content?: string | null
}

/**
 * Tool 消息
 */
export interface ToolMessage {
	/** 该消息的发起角色 */
	role: "tool"
	/** tool 消息的内容 */
	content: string
	/** 此消息所响应的 tool call 的 ID */
	tool_call_id: string
}

// ============== Request Types ==============

/**
 * 思考配置
 */
export interface ThinkingConfig {
	/** 如果设为 enabled，则使用思考模式。如果设为 disabled，则使用非思考模式 */
	type?: ThinkingType
}

/**
 * 响应格式
 */
export interface ResponseFormat {
	/** 响应格式类型 */
	type?: ResponseFormatType
}

/**
 * 流式输出选项
 */
export interface StreamOptions {
	/** 是否在最后的块中包含 usage 信息 */
	include_usage?: boolean
}

/**
 * 工具函数参数
 */
export interface FunctionParameters {
	[property: string]: unknown
}

/**
 * 工具函数定义
 */
export interface FunctionDefinition {
	/** function 的功能描述 */
	description?: string
	/** 要调用的 function 名称 */
	name: string
	/** function 的输入参数 */
	parameters?: FunctionParameters
	/** 是否使用 strict 模式 */
	strict?: boolean
}

/**
 * 工具定义
 */
export interface Tool {
	/** tool 的类型 */
	type: ToolType
	/** function 定义 */
	function: FunctionDefinition
}

/**
 * 指定工具调用
 */
export interface ChatCompletionNamedToolChoice {
	/** 类型 */
	type: "function"
	/** 函数 */
	function: {
		/** 函数名称 */
		name: string
	}
}

/** 工具选择类型 */
export type ToolChoice = ChatCompletionToolChoice | ChatCompletionNamedToolChoice

/**
 * 对话补全请求
 */
export interface ChatCompletionRequest {
	/** 对话的消息列表 (必需) */
	messages: Array<SystemMessage | UserMessage | AssistantMessage | ToolMessage>
	/** 使用的模型的 ID (必需) */
	model: ModelId | string

	/** 控制思考模式与非思考模式的转换 */
	thinking?: ThinkingConfig | null
	/** 控制模型的推理强度 */
	reasoning_effort?: ReasoningEffort
	/** 限制一次请求中模型生成 completion 的最大 token 数 */
	max_tokens?: number | null
	/** 指定模型必须输出的格式 */
	response_format?: ResponseFormat | null
	/** 在遇到这些词时，API 将停止生成更多的 token */
	stop?: string | string[] | null
	/** 是否以流式发送消息增量 */
	stream?: boolean | null
	/** 流式输出相关选项 */
	stream_options?: StreamOptions | null
	/** 采样温度 (0-2) */
	temperature?: number | null
	/** top-p 采样 (0-1) */
	top_p?: number | null
	/** 模型可能会调用的 tool 的列表 */
	tools?: Tool[] | null
	/** 控制模型调用 tool 的行为 */
	tool_choice?: ToolChoice | null
	/** 是否返回所输出 token 的对数概率 */
	logprobs?: boolean | null
	/** 每个输出位置返回输出概率 top N 的 token */
	top_logprobs?: number | null
	/** 自定义的 user_id */
	user_id?: string | null
}

// ============== Response Types ==============

/**
 * Token 对数概率信息
 */
export interface TokenLogProb {
	/** 输出的 token */
	token: string
	/** 该 token 的对数概率 */
	logprob: number
	/** 该 token UTF-8 字节表示的整数列表 */
	bytes?: number[] | null
}

/**
 * Token 对数概率信息 (包含 top_logprobs)
 */
export interface TokenLogProbWithTop extends TokenLogProb {
	/** 输出概率 top N 的 token 列表 */
	top_logprobs: TokenLogProb[]
}

/**
 * 对数概率信息
 */
export interface LogProbs {
	/** 输出 token 对数概率信息列表 */
	content?: TokenLogProbWithTop[] | null
	/** 推理内容 token 对数概率信息列表 */
	reasoning_content?: TokenLogProbWithTop[] | null
}

/**
 * 工具调用响应
 */
export interface ToolCallResponse {
	/** tool 调用的 ID */
	id: string
	/** tool 的类型 */
	type: "function"
	/** 模型调用的 function */
	function: {
		/** 模型调用的 function 名 */
		name: string
		/** 要调用的 function 的参数 (JSON 格式) */
		arguments: string
	}
}

/**
 * 响应消息
 */
export interface ChatCompletionMessage {
	/** 该 completion 的内容 */
	content?: string | null
	/** 仅适用于思考模式，推理内容 */
	reasoning_content?: string | null
	/** 模型生成的 tool 调用 */
	tool_calls?: ToolCallResponse[]
	/** 生成这条消息的角色 */
	role: "assistant"
	/** 该 choice 的对数概率信息 */
	logprobs?: LogProbs | null
}

/**
 * 对话补全选择项
 */
export interface ChatCompletionChoice {
	/** 模型停止生成 token 的原因 */
	finish_reason: FinishReason
	/** 该 completion 在选择列表中的索引 */
	index: number
	/** 模型生成的 completion 消息 */
	message: ChatCompletionMessage
}

/**
 * Token 使用情况
 */
export interface Usage {
	/** 模型 completion 产生的 token 数 */
	completion_tokens: number
	/** 用户 prompt 所包含的 token 数 */
	prompt_tokens: number
	/** 用户 prompt 中，命中上下文缓存的 token 数 */
	prompt_cache_hit_tokens: number
	/** 用户 prompt 中，未命中上下文缓存的 token 数 */
	prompt_cache_miss_tokens: number
	/** 该请求中，所有 token 的数量 */
	total_tokens: number
	/** completion tokens 的详细信息 */
	completion_tokens_details?: {
		/** 推理模型所产生的思维链 token 数量 */
		reasoning_tokens: number
	}
}

/**
 * 对话补全响应
 */
export interface ChatCompletionResponse {
	/** 该对话的唯一标识符 */
	id: string
	/** 模型生成的 completion 的选择列表 */
	choices: ChatCompletionChoice[]
	/** 创建聊天完成时的 Unix 时间戳（秒） */
	created: number
	/** 生成该 completion 的模型名 */
	model: string
	/** 后端配置指纹 */
	system_fingerprint: string
	/** 对象的类型 */
	object: ChatCompletionObject
	/** 该对话补全请求的用量信息 */
	usage?: Usage
}
