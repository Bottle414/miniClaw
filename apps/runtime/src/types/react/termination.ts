/**
 * ReAct 循环终止原因类型定义
 *
 * 定义 ReAct 循环可能终止的所有原因
 */

/**
 * ReAct 循环终止原因
 *
 * - final_answer: LLM 提供了最终答案（无工具调用）
 * - iteration_limit: 达到最大迭代次数限制
 * - error: 发生错误（API 错误、工具执行错误等）
 * - empty_response: LLM 返回空响应
 */
export type TerminationReason =
	| "final_answer"
	| "iteration_limit"
	| "error"
	| "empty_response"

/**
 * 有效的终止原因数组（用于验证）
 */
export const VALID_TERMINATION_REASONS: readonly TerminationReason[] = [
	"final_answer",
	"iteration_limit",
	"error",
	"empty_response"
] as const

/**
 * 验证是否为有效的终止原因
 */
export function isValidTerminationReason(
	reason: string
): reason is TerminationReason {
	return VALID_TERMINATION_REASONS.includes(reason as TerminationReason)
}
