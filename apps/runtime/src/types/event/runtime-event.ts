/**
 * Runtime Event 类型定义
 * 流式输出的标准事件协议
 */

import type { LLMFinishReason, LLMUsage } from "../llm"

// ============== Runtime Event Types ==============

/** 文本增量事件 */
export interface TextDeltaEvent {
	type: "text-delta"
	/** 文本增量内容 */
	delta: string
}

/** 工具调用开始事件 */
export interface ToolCallStartEvent {
	type: "tool-call-start"
	/** 工具调用 ID */
	toolCallId: string
	/** 工具名称 */
	toolName: string
}

/** 工具调用参数增量事件 */
export interface ToolCallDeltaEvent {
	type: "tool-call-delta"
	/** 工具调用 ID */
	toolCallId: string
	/** 参数增量（JSON 字符串片段） */
	argumentsDelta: string
}

/** 工具调用结束事件 */
export interface ToolCallEndEvent {
	type: "tool-call-end"
	/** 工具调用 ID */
	toolCallId: string
	/** 完整参数（JSON 字符串） */
	arguments: string
}

/** 工具结果事件 */
export interface ToolResultEvent {
	type: "tool-result"
	/** 工具调用 ID */
	toolCallId: string
	/** 工具执行结果 */
	result: string
	/** 是否执行成功 */
	success: boolean
}

/** 完成事件 */
export interface FinishEvent {
	type: "finish"
	/** 完成原因 */
	reason: LLMFinishReason
	/** Token 使用情况 */
	usage?: LLMUsage
}

/** 错误事件 */
export interface ErrorEvent {
	type: "error"
	/** 错误信息 */
	error: Error
}

/**
 * Runtime Event 联合类型
 * 通过 type 字段实现 discriminated union
 */
export type RuntimeEvent =
	| TextDeltaEvent
	| ToolCallStartEvent
	| ToolCallDeltaEvent
	| ToolCallEndEvent
	| ToolResultEvent
	| FinishEvent
	| ErrorEvent
