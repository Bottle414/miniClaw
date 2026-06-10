/**
 * ReAct 循环阶段类型定义
 *
 * ReAct 模式包含四个显式阶段：
 * - thinking: LLM 思考下一步行动
 * - acting: LLM 决定调用工具或提供最终答案
 * - observing: 系统执行工具并收集结果
 * - deciding: 系统评估是否终止循环
 */

/**
 * ReAct 循环阶段
 */
export type ReActPhase = "thinking" | "acting" | "observing" | "deciding"

/**
 * 有效的 ReAct 阶段数组（用于验证）
 */
export const VALID_REACT_PHASES: readonly ReActPhase[] = [
	"thinking",
	"acting",
	"observing",
	"deciding"
] as const

/**
 * 验证是否为有效的 ReAct 阶段
 */
export function isValidReActPhase(phase: string): phase is ReActPhase {
	return VALID_REACT_PHASES.includes(phase as ReActPhase)
}
