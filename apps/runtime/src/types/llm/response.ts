/**
 * 统一 LLM 响应类型定义
 * 与具体 LLM 提供商无关的抽象响应类型
 */

import type { LLMToolCall, Segment } from "./message"

// ============== Possible Values ==============

/** 停止原因 */
export type LLMFinishReason = "stop" | "length" | "content_filter" | "tool_calls" | "insufficient_system_resource"

// ============== Response Types ==============

/**
 * Token 使用情况
 */
export interface LLMUsage {
	/** 提示 token 数 */
	promptTokens: number
	/** 补全 token 数 */
	completionTokens: number
	/** 总 token 数 */
	totalTokens: number
}

/**
 * 响应消息
 */
export interface LLMResponseMessage {
	/** 消息内容 */
	content: Segment[]
	/** 消息角色 */
	role: "assistant"
	/** 工具调用列表 */
	toolCalls?: LLMToolCall[]
}

/**
 * LLM 响应
 */
export interface LLMResponse {
	/** 响应 ID */
	id: string
	/** 创建时间戳 (秒) */
	created: number
	/** 模型标识 */
	model?: string
	/** Token 使用情况 */
	usage?: LLMUsage
}
