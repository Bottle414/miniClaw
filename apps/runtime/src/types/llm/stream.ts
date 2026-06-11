/**
 * 统一 LLM 流式类型定义
 * 与具体 LLM 提供商无关的抽象流式类型
 */

import type { LLMFinishReason, LLMUsage } from "./response"
import type { LLMRole } from "./message"

// ============== Stream Types ==============

/**
 * 流式工具调用增量
 */
export interface LLMStreamToolCall {
	/** 工具调用在当前响应中的索引 */
	index: number
	/** 工具调用 ID（仅首个 chunk 包含） */
	id?: string
	/** 工具函数信息 */
	function?: {
		/** 函数名称（仅首个 chunk 包含） */
		name?: string
		/** 函数参数增量（JSON 字符串片段） */
		arguments?: string
	}
}

/**
 * 流式增量内容
 */
export interface LLMStreamDelta {
	/** 消息角色（仅首个 chunk 包含） */
	role?: LLMRole
	/** 文本内容增量 */
	content?: string
	/** 工具调用增量列表 */
	toolCalls?: LLMStreamToolCall[]
}

/**
 * 流式选择项
 */
export interface LLMStreamChoice {
	/** 选择项索引 */
	index: number
	/** 增量内容 */
	delta: LLMStreamDelta
	/** 完成原因 */
	finishReason: LLMFinishReason | null
}

/**
 * 流式响应 chunk
 */
export interface LLMStreamChunk {
	/** 响应 ID */
	id: string
	/** 模型标识 */
	model?: string
	/** 选择项列表 */
	choices: LLMStreamChoice[]
	/** Token 使用情况（仅最后一个 chunk 可能包含） */
	usage?: LLMUsage
}
