/**
 * ReAct 状态管理模块
 *
 * 提供不可变的 ReAct 状态管理功能
 */

import type {
	ReActState,
	ReActStateUpdate,
	RuntimePhase
} from "../types/react"
import { isValidRuntimePhase } from "../types/react"

/**
 * 创建初始 ReAct 状态
 *
 * @returns 初始化的 ReAct 状态对象
 */
export function createInitialState(): ReActState {
	return {
		iteration: 0,
		phase: "thinking",
		messages: [],
		actionHistory: [],
		observationHistory: [],
		shouldTerminate: false
	}
}

/**
 * 更新 ReAct 状态（不可变更新）
 *
 * @param state 当前状态
 * @param update 部分状态更新
 * @returns 新的状态对象
 * @throws Error 如果更新包含无效的阶段值
 */
export function updateState(
	state: ReActState,
	update: ReActStateUpdate
): ReActState {
	// 验证阶段更新
	if (update.phase !== undefined && !isValidRuntimePhase(update.phase)) {
		throw new Error(`Invalid ReAct phase: ${update.phase}`)
	}

	// 创建新状态对象（浅拷贝 + 更新）
	const newState: ReActState = {
		iteration: update.iteration ?? state.iteration,
		phase: update.phase ?? state.phase,
		messages: update.messages ?? state.messages,
		actionHistory: update.actionHistory ?? state.actionHistory,
		observationHistory:
			update.observationHistory ?? state.observationHistory,
		shouldTerminate: update.shouldTerminate ?? state.shouldTerminate,
		terminationReason: update.terminationReason ?? state.terminationReason
	}

	return newState
}

/**
 * 获取当前迭代次数
 */
export function getIteration(state: ReActState): number {
	return state.iteration
}

/**
 * 获取当前阶段
 */
export function getPhase(state: ReActState): RuntimePhase {
	return state.phase
}

/**
 * 获取消息历史
 */
export function getMessages(state: ReActState): ReActState["messages"] {
	return state.messages
}

/**
 * 获取行动历史
 */
export function getActionHistory(
	state: ReActState
): ReActState["actionHistory"] {
	return state.actionHistory
}

/**
 * 获取观察历史
 */
export function getObservationHistory(
	state: ReActState
): ReActState["observationHistory"] {
	return state.observationHistory
}

/**
 * 检查是否应该终止
 */
export function shouldTerminate(state: ReActState): boolean {
	return state.shouldTerminate
}

/**
 * 获取终止原因
 */
export function getTerminationReason(
	state: ReActState
): ReActState["terminationReason"] {
	return state.terminationReason
}

/**
 * 验证阶段转换是否合法
 *
 * @param from 当前阶段
 * @param to 目标阶段
 * @returns 是否为合法转换
 */
export function isValidPhaseTransition(
	from: RuntimePhase,
	to: RuntimePhase
): boolean {
	// 定义合法的阶段转换
	const validTransitions: Record<RuntimePhase, RuntimePhase[]> = {
		thinking: ["acting"],
		acting: ["observing", "deciding"],
		observing: ["deciding"],
		deciding: ["thinking"] // 继续下一轮迭代
	}

	return validTransitions[from].includes(to)
}

/**
 * 添加消息到状态
 */
export function addMessage(
	state: ReActState,
	message: ReActState["messages"][0]
): ReActState {
	return updateState(state, {
		messages: [...state.messages, message]
	})
}

/**
 * 添加行动到历史
 */
export function addAction(
	state: ReActState,
	action: ReActState["actionHistory"][0]
): ReActState {
	return updateState(state, {
		actionHistory: [...state.actionHistory, action]
	})
}

/**
 * 添加观察到历史
 */
export function addObservation(
	state: ReActState,
	observation: ReActState["observationHistory"][0]
): ReActState {
	return updateState(state, {
		observationHistory: [...state.observationHistory, observation]
	})
}

/**
 * 增加迭代次数
 */
export function incrementIteration(state: ReActState): ReActState {
	return updateState(state, {
		iteration: state.iteration + 1
	})
}

/**
 * 设置阶段
 */
export function setPhase(state: ReActState, phase: RuntimePhase): ReActState {
	return updateState(state, { phase })
}

/**
 * 标记终止
 */
export function markTermination(
	state: ReActState,
	reason: ReActState["terminationReason"]
): ReActState {
	return updateState(state, {
		shouldTerminate: true,
		terminationReason: reason
	})
}
