/**
 * ReAct 行动记录类型定义
 *
 * 记录 ReAct 循环中执行的每个工具调用
 */

/**
 * 行动记录
 *
 * 表示在 ReAct 循环中执行的一次工具调用
 */
export interface ActionRecord {
	/** 工具调用 ID（由 LLM 生成） */
	toolCallId: string

	/** 工具名称 */
	toolName: string

	/** 工具参数（JSON 字符串） */
	parameters: string

	/** 执行时间戳（毫秒） */
	timestamp: number

	/** 执行结果（可选，在 Observe 阶段填充） */
	result?: string

	/** 是否成功（可选，在 Observe 阶段填充） */
	success?: boolean

	/** 错误信息（可选，执行失败时填充） */
	error?: string
}

/**
 * 行动历史
 *
 * 维护 ReAct 循环中所有行动的完整记录
 */
export type ActionHistory = ActionRecord[]
