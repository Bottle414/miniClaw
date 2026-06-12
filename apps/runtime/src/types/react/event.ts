/**
 * ReAct 事件类型定义
 *
 * 定义 ReAct 循环流式输出的事件协议
 * 包含两类事件：透传的 LLM 流式事件和 ReAct 循环层级事件
 */

import type { LLMFinishReason, LLMUsage } from "../llm"
import type { ReActPhase } from "./phase"
import type { TerminationReason } from "./termination"

// ============== 透传 LLM 流式事件 ==============

/** 文本增量事件 */
export interface ReActTextDeltaEvent {
	type: "text-delta"
	delta: string
}

/** 工具调用开始事件 */
export interface ReActToolCallStartEvent {
	type: "tool-call-start"
	toolCallId: string
	toolName: string
}

/** 工具调用参数增量事件 */
export interface ReActToolCallDeltaEvent {
	type: "tool-call-delta"
	toolCallId: string
	argumentsDelta: string
}

/** 工具调用结束事件 */
export interface ReActToolCallEndEvent {
	type: "tool-call-end"
	toolCallId: string
	arguments: string
}

/** 完成事件 */
export interface ReActFinishEvent {
	type: "finish"
	reason: LLMFinishReason
	usage?: LLMUsage
}

/** 错误事件 */
export interface ReActErrorEvent {
	type: "error"
	error: Error
}

// ============== ReAct 循环层级事件 ==============

/** 迭代开始事件 */
export interface ReActIterationStartEvent {
	type: "react-iteration-start"
	iteration: number
}

/** 阶段转换事件 */
export interface ReActPhaseChangeEvent {
	type: "react-phase-change"
	phase: ReActPhase
	iteration: number
}

/** 工具执行开始事件 */
export interface ReActToolExecuteEvent {
	type: "react-tool-execute"
	toolCallId: string
	toolName: string
}

/** 工具执行结果事件 */
export interface ReActToolResultEvent {
	type: "react-tool-result"
	toolCallId: string
	toolName: string
	result: string
	success: boolean
}

/** 循环结束事件 */
export interface ReActLoopEndEvent {
	type: "react-loop-end"
	reason: TerminationReason | "empty_response"
	iterations: number
}

// ============== 联合类型 ==============

/**
 * ReAct 事件联合类型
 *
 * 透传 LLM 流式事件 + ReAct 循环层级事件
 */
export type ReActEvent =
	// 透传 LLM 流式事件
	| ReActTextDeltaEvent
	| ReActToolCallStartEvent
	| ReActToolCallDeltaEvent
	| ReActToolCallEndEvent
	| ReActFinishEvent
	| ReActErrorEvent
	// ReAct 循环层级事件
	| ReActIterationStartEvent
	| ReActPhaseChangeEvent
	| ReActToolExecuteEvent
	| ReActToolResultEvent
	| ReActLoopEndEvent

/** ReAct 循环层级事件子集 */
export type ReActLoopEvent =
	| ReActIterationStartEvent
	| ReActPhaseChangeEvent
	| ReActToolExecuteEvent
	| ReActToolResultEvent
	| ReActLoopEndEvent

/** ReAct 阶段事件子集 */
export type ReActPhaseEvent = ReActPhaseChangeEvent
