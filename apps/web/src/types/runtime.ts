/**
 * Runtime Inspector 类型定义
 *
 * 用于 Runtime Inspector 面板展示的事件、工具、迭代等数据类型
 */

/** ReAct 迭代阶段 */
export type RuntimePhase = "thinking" | "acting" | "observing" | "deciding"

/** 阶段记录（包含阶段名和该阶段的详细内容） */
export interface PhaseRecord {
	/** 阶段名 */
	phase: RuntimePhase
	/** 思考内容（reasoning-delta 累积） */
	reasoning?: string
	/** LLM 回复内容（text-delta 累积） */
	text?: string
	/** 工具调用列表 */
	toolCalls?: Array<{
		toolCallId: string
		toolName: string
		arguments?: string
		result?: string
		success?: boolean
	}>
	/** 终止原因（仅 deciding 阶段） */
	terminationReason?: string
}

/** 迭代记录 */
export interface IterationRecord {
	/** 迭代序号 */
	iteration: number
	/** 阶段记录列表 */
	phases: PhaseRecord[]
}

/** 工具执行记录 */
export interface ToolRecord {
	/** 工具调用 ID */
	toolCallId: string
	/** 工具名称 */
	toolName: string
	/** 调用参数（JSON 字符串） */
	arguments?: string
	/** 执行结果 */
	result?: string
	/** 是否执行成功 */
	success?: boolean
	/** 是否已完成（收到 tool-result） */
	isComplete: boolean
}

/** Runtime 事件（从 SSE 接收的原始事件） */
export interface RuntimeEventData {
	type: string
	[key: string]: unknown
}

/** Session 完整信息（从 GET /api/session/:id 获取） */
export interface SessionDetail {
	id: string
	name: string
	createdAt: number
	updatedAt: number
	messages: Array<{ role: string; content: string }>
	summary: Array<{ summary: string; createdAt: number }>
	facts: Array<{ category: string; content: string }>
	canonicalMessagesCount: number
	contextMessagesCount: number
}

/** 工具指标 */
export interface ToolMetricsData {
	/** 调用次数 */
	callCount: number
	/** 错误次数 */
	errorCount: number
	/** 总耗时（ms） */
	totalDurationMs: number
	/** 平均耗时（ms） */
	avgDurationMs: number
	/** 最后调用时间（ISO 8601） */
	lastCalledAt: string
	/** 缓存命中次数 */
	cacheHits: number
	/** 缓存未命中次数 */
	cacheMisses: number
	/** 超时次数 */
	timeoutCount: number
	/** 重试次数 */
	retryCount: number
}

/** Metrics 状态（从 GET /api/session/:id/metrics 获取） */
export interface MetricsState {
	tools: Record<string, ToolMetricsData>
}
