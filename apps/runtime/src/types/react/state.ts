/**
 * ReAct 状态接口定义
 *
 * 捕获 ReAct 循环在任意时刻的完整状态
 */

import type { LLMMessage } from "../llm/message"
import type { ReActPhase } from "./phase"
import type { ActionHistory } from "./action"
import type { ObservationHistory } from "./observation"
import type { TerminationReason } from "./termination"

/**
 * ReAct 循环状态
 *
 * 不可变状态对象，记录循环执行的完整信息
 */
export interface ReActState {
	/** 当前迭代次数（从 0 开始） */
	iteration: number

	/** 当前阶段 */
	phase: ReActPhase

	/** 消息历史 */
	messages: LLMMessage[]

	/** 行动历史 */
	actionHistory: ActionHistory

	/** 观察历史 */
	observationHistory: ObservationHistory

	/** 是否应该终止 */
	shouldTerminate: boolean

	/** 终止原因（可选，终止时填充） */
	terminationReason?: TerminationReason
}

/**
 * ReAct 状态更新（部分更新）
 *
 * 用于 updateState() 函数的部分状态更新
 */
export type ReActStateUpdate = Partial<ReActState>
