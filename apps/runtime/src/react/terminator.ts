/**
 * ReAct 终止逻辑模块
 *
 * 提供 ReAct 循环的终止条件检查功能
 */

import type { ReActState } from "../types/react"
import type { TerminationReason } from "../types/react"
import type { LLMAssistantMessage } from "../types/llm"

/**
 * 终止检查配置
 */
export interface TerminationConfig {
	/** 最大迭代次数 */
	maxIterations: number
}

/**
 * 终止检查结果
 */
export interface TerminationCheckResult {
	/** 是否应该终止 */
	shouldTerminate: boolean

	/** 终止原因（如果应该终止） */
	reason?: TerminationReason

	/** 详细信息 */
	details?: string
}

/**
 * 检查是否应该终止 ReAct 循环
 *
 * 多级终止检查（按优先级）：
 * 1. LLM 提供最终答案
 * 2. 达到迭代限制
 * 3. 错误条件
 * 4. 空响应
 *
 * @param state 当前 ReAct 状态
 * @param config 终止配置
 * @param lastMessage 最新的助手消息（可选）
 * @returns 终止检查结果
 */
export function shouldTerminate(
	state: ReActState,
	config: TerminationConfig,
	lastMessage?: LLMAssistantMessage
): TerminationCheckResult {
	// 检查 1: 迭代限制
	const iterationCheck = checkIterationLimit(state, config)
	if (iterationCheck.shouldTerminate) {
		return iterationCheck
	}

	// 检查 2: 最终答案
	const finalAnswerCheck = checkFinalAnswer(lastMessage)
	if (finalAnswerCheck.shouldTerminate) {
		return finalAnswerCheck
	}

	// 检查 3: 空响应
	const emptyResponseCheck = checkEmptyResponse(lastMessage)
	if (emptyResponseCheck.shouldTerminate) {
		return emptyResponseCheck
	}

	// 检查 4: 错误条件（在 state 中标记）
	if (state.shouldTerminate && state.terminationReason === "error") {
		return {
			shouldTerminate: true,
			reason: "error",
			details: "Error condition detected in state"
		}
	}

	// 不终止
	return { shouldTerminate: false }
}

/**
 * 检查是否达到迭代限制
 */
export function checkIterationLimit(
	state: ReActState,
	config: TerminationConfig
): TerminationCheckResult {
	if (state.iteration >= config.maxIterations) {
		return {
			shouldTerminate: true,
			reason: "iteration_limit",
			details: `Reached maximum iterations: ${state.iteration}/${config.maxIterations}`
		}
	}

	return { shouldTerminate: false }
}

/**
 * 检查 LLM 是否提供了最终答案
 *
 * 最终答案条件：
 * - 消息存在
 * - 有内容
 * - 无工具调用
 */
export function checkFinalAnswer(
	lastMessage?: LLMAssistantMessage
): TerminationCheckResult {
	if (!lastMessage) {
		return { shouldTerminate: false }
	}

	// 有工具调用 → 继续循环
	if (lastMessage.toolCalls && lastMessage.toolCalls.length > 0) {
		return { shouldTerminate: false }
	}

	// 有内容且无工具调用 → 最终答案
	if (lastMessage.content && lastMessage.content.length > 0) {
		return {
			shouldTerminate: true,
			reason: "final_answer",
			details: "LLM provided final answer without tool calls"
		}
	}

	return { shouldTerminate: false }
}

/**
 * 检查是否为空响应
 *
 * 空响应条件：
 * - 消息存在
 * - 无内容或内容为空
 * - 无工具调用
 */
export function checkEmptyResponse(
	lastMessage?: LLMAssistantMessage
): TerminationCheckResult {
	if (!lastMessage) {
		return { shouldTerminate: false }
	}

	// 有工具调用 → 不是空响应
	if (lastMessage.toolCalls && lastMessage.toolCalls.length > 0) {
		return { shouldTerminate: false }
	}

	// 有内容 → 不是空响应
	if (lastMessage.content && lastMessage.content.length > 0) {
		return { shouldTerminate: false }
	}

	// 无内容且无工具调用 → 空响应
	return {
		shouldTerminate: true,
		reason: "empty_response",
		details: "LLM returned empty response without tool calls"
	}
}

/**
 * 创建错误终止结果
 */
export function createErrorTermination(
	error: Error
): TerminationCheckResult {
	return {
		shouldTerminate: true,
		reason: "error",
		details: `Error: ${error.message}`
	}
}
