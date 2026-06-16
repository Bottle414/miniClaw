/**
 * Runtime Event 类型定义
 *
 * Runtime 对外暴露的顶层事件协议
 * 包含两类事件：Provider 流式事件（透传）和 Runtime 生命周期事件
 */

import type { LLMFinishReason, LLMUsage } from "../llm"
import type { ProviderEvent } from "./provider-event"
import type { RuntimePhase } from "../react/phase"
import type { TerminationReason } from "../react/termination"

// ============== Runtime Lifecycle Event Types ==============

/** 迭代开始事件 */
export interface IterationStartEvent {
	type: "iteration-start"
	/** 当前迭代次数 */
	iteration: number
}

/** 阶段转换事件 */
export interface PhaseChangeEvent {
	type: "phase-change"
	/** 当前阶段 */
	phase: RuntimePhase
	/** 当前迭代次数 */
	iteration: number
}

/** 工具执行开始事件 */
export interface ToolExecuteEvent {
	type: "tool-execute"
	/** 工具调用 ID */
	toolCallId: string
	/** 工具名称 */
	toolName: string
}

/** 工具执行结果事件 */
export interface ToolResultEvent {
	type: "tool-result"
	/** 工具调用 ID */
	toolCallId: string
	/** 工具名称 */
	toolName: string
	/** 工具执行结果 */
	result: string
	/** 是否执行成功 */
	success: boolean
}

/** 循环结束事件 */
export interface LoopEndEvent {
	type: "loop-end"
	/** 终止原因 */
	reason: TerminationReason | "empty_response"
	/** 总迭代次数 */
	iterations: number
}

// ============== 联合类型 ==============

/**
 * Runtime Lifecycle 事件联合类型
 * Runtime 循环层级发出的事件
 */
export type RuntimeLifecycleEvent =
	| IterationStartEvent
	| PhaseChangeEvent
	| ToolExecuteEvent
	| ToolResultEvent
	| LoopEndEvent

/**
 * Runtime Event 联合类型
 *
 * Provider 流式事件（透传）+ Runtime 生命周期事件
 * 通过 type 字段实现 discriminated union
 */
export type RuntimeEvent =
	| ProviderEvent
	| RuntimeLifecycleEvent
