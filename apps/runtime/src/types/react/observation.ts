/**
 * ReAct 观察记录类型定义
 *
 * 记录工具执行的结果，供 LLM 在下一轮推理中使用
 */

/**
 * 观察记录
 *
 * 表示工具执行后产生的观察结果
 */
export interface ObservationRecord {
	/** 工具调用 ID（与 ActionRecord 关联） */
	toolCallId: string

	/** 工具名称 */
	toolName: string

	/** 执行结果（字符串形式） */
	result: string

	/** 是否成功 */
	success: boolean

	/** 错误信息（可选，执行失败时填充） */
	error?: string

	/** 执行时间戳（毫秒） */
	timestamp: number
}

/**
 * 观察历史
 *
 * 维护 ReAct 循环中所有观察结果的完整记录
 */
export type ObservationHistory = ObservationRecord[]
