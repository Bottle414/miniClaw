/**
 * 统一 LLM 消息类型定义
 * 与具体 LLM 提供商无关的抽象消息类型
 */

// ============== Possible Values ==============

/** 消息角色 */
export type LLMRole = "system" | "user" | "assistant" | "tool"

/**
 * 消息碎片
 */
export type Segment = TextSegment

export interface TextSegment {
	type: "text"
	text: string
}

// ============== Message Types ==============

/**
 * 系统消息
 */
export interface LLMSystemMessage {
	/** 消息角色 */
	role: "system"
	/** 消息内容 */
	content: Segment[]
}

/**
 * 用户消息
 */
export interface LLMUserMessage {
	/** 消息角色 */
	role: "user"
	/** 消息内容 */
	content: Segment[]
}

/**
 * 工具调用信息
 */
export interface LLMToolCall {
	/** 工具调用 ID */
	id: string
	/** 函数名称 */
	name: string
	/** 函数参数 (JSON 字符串) */
	arguments: string
}

/**
 * 助手消息
 */
export interface LLMAssistantMessage {
	/** 消息角色 */
	role: "assistant"
	/** 消息内容 */
	content: Segment[] | null
	/** 工具调用列表 */
	toolCalls?: LLMToolCall[]
}

/**
 * 工具消息
 */
export interface LLMToolMessage {
	/** 消息内容 */
	content: Segment[]
	/** 消息角色 */
	role: "tool"
	/** 对应的工具调用 ID */
	toolCallId: string
}

/** 统一消息类型联合 */
export type LLMMessage = LLMSystemMessage | LLMUserMessage | LLMAssistantMessage | LLMToolMessage
