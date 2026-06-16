/**
 * Runtime 循环阶段类型定义
 *
 * Runtime 循环包含四个显式阶段：
 * - thinking: LLM 思考下一步行动
 * - acting: LLM 决定调用工具或提供最终答案
 * - observing: 系统执行工具并收集结果
 * - deciding: 系统评估是否终止循环
 */

/**
 * Runtime 循环阶段
 */
export type RuntimePhase = "thinking" | "acting" | "observing" | "deciding"

/**
 * 有效的 Runtime 阶段数组（用于验证）
 */
export const VALID_RUNTIME_PHASES: readonly RuntimePhase[] = [
	"thinking",
	"acting",
	"observing",
	"deciding"
] as const

/**
 * 验证是否为有效的 Runtime 阶段
 */
export function isValidRuntimePhase(phase: string): phase is RuntimePhase {
	return VALID_RUNTIME_PHASES.includes(phase as RuntimePhase)
}
