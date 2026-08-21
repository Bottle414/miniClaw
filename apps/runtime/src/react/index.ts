/**
 * ReAct 模块入口
 *
 * 导出 ReAct 循环相关功能
 */

// ReAct 循环编排
export * from "./loop"

// ReAct 状态管理
export {
	createInitialState,
	updateState,
	getIteration,
	getPhase,
	getMessages,
	shouldTerminate as shouldTerminateState,
	getTerminationReason,
	isValidPhaseTransition,
	addMessage,
	incrementIteration,
	setPhase,
	markTermination
} from "./state"

// ReAct 终止逻辑
export {
	shouldTerminate,
	checkIterationLimit,
	checkFinalAnswer,
	checkEmptyResponse,
	createErrorTermination
} from "./terminator"

export type { TerminationConfig, TerminationCheckResult } from "./terminator"
