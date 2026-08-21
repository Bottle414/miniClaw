/**
 * 统一 LLM 工具类型定义
 * 与具体 LLM 提供商无关的抽象工具类型
 */

// ============== Tool Types ==============

/** 工具选择模式 */
export type LLMToolChoiceMode = "none" | "auto" | "required"

/**
 * 工具函数参数定义
 * 支持 JSON Schema 格式
 */
export interface LLMFunctionParameters {
	/** 参数类型 */
	type?: string
	/** 参数属性定义 */
	properties?: Record<string, unknown>
	/** 必需参数列表 */
	required?: string[]
	/** 其他 JSON Schema 字段 */
	[key: string]: unknown
}

/**
 * 指定工具调用
 */
export interface LLMNamedToolChoice {
	/** 类型 */
	type: "function"
	/** 函数信息 */
	function: {
		/** 函数名称 */
		name: string
	}
}

/**
 * 工具定义
 */
export interface LLMTool {
	/** 工具名称 */
	name: string
	/** 工具描述 */
	description: string
	/** 工具函数参数定义 */
	parameters?: LLMFunctionParameters
}

/** 工具选择类型 */
export type LLMToolChoice = LLMToolChoiceMode | LLMNamedToolChoice

// ============== Tool Runtime Types ==============

/**
 * 工具执行上下文
 * 传递给 executor 的运行时信息
 */
export interface ToolExecutionContext {
	/** 合并后的中止信号（parent + timeout） */
	abortSignal?: AbortSignal
}

/**
 * 工具执行结果
 */
export interface ToolResult {
	/** 结果内容 */
	content: string
	/** 结果元数据 */
	metadata?: Record<string, unknown>
	/** 错误信息 */
	error?: {
		code: string
		message: string
	}
}

/**
 * 异步工具执行函数类型
 */
export type ToolExecutor = (
	params: Record<string, unknown>,
	context: ToolExecutionContext
) => Promise<ToolResult>

/**
 * 工具元数据
 * 基于 capability 声明中间件行为差异，category 仅用于描述
 */
export interface ToolMetadata {
	/** 工具类别，仅用于描述和日志，不作为中间件行为推断依据 */
	category?: "file" | "network" | "compute" | "system" | "browser" | "mcp"
	/** 是否可重试，默认 true */
	retryable?: boolean
	/** 最大重试次数，默认 0 */
	maxRetries?: number
	/** 重试间隔基数（ms），默认 1000，实际间隔 = base * 2^attempt */
	retryBaseDelay?: number
	/** 超时时间（ms），默认 30000 */
	timeoutMs?: number
	/** 所需权限点列表 */
	requiredPermissions?: string[]
	/** 是否可缓存，默认 false */
	cacheable?: boolean
	/** 缓存 key 生成策略，默认基于 toolName + stableStringify(params) */
	cacheKeyFn?: (params: Record<string, unknown>) => string
	/** 是否为危险操作，默认 false */
	dangerous?: boolean
	/**
	 * 是否为只读工具（无副作用，同轮多个 toolCalls 可安全并行执行），默认 false
	 * 未显式声明为 true 的工具在多工具调用时退化为串行执行，避免未来新增写类工具意外并行
	 */
	readonly?: boolean
}

/**
 * 中间件运行时状态
 * 每个中间件只写自己负责的字段，其他字段只读
 */
export interface MiddlewareRuntimeState {
	/** 工具调用开始时间戳（ms since epoch），由 call() 入口设置 */
	startedAt?: number
	/** 当前重试次数，由 retry middleware 写入 */
	retryCount?: number
	/** 是否命中缓存，由 cache middleware 写入 */
	cacheHit?: boolean
	/** 是否触发超时，由 timeout middleware 写入 */
	timeoutTriggered?: boolean
}

/**
 * 中间件上下文
 */
export interface MiddlewareContext {
	/** 工具名称 */
	toolName: string
	/** 工具参数 */
	params: Record<string, unknown>
	/** 工具元数据 */
	metadata: ToolMetadata
	/** 会话 ID */
	sessionId: string
	/** 中止信号（parent signal，由 timeout middleware 合并） */
	abortSignal?: AbortSignal
	/** 中间件间共享的运行时状态 */
	runtime: MiddlewareRuntimeState
}

/**
 * 工具中间件类型
 * 洋葱模型：接收 context 和 next 函数，返回 Promise<ToolResult>
 */
export type ToolMiddleware = (
	context: MiddlewareContext,
	next: () => Promise<ToolResult>
) => Promise<ToolResult>

/**
 * 工具执行记录
 * 存储在 session 下的 tool-runs.json
 */
export interface ToolExecutionRecord {
	/** 工具名称 */
	toolName: string
	/** 开始时间（ISO 8601） */
	startedAt: string
	/** 结束时间（ISO 8601） */
	finishedAt: string
	/** 执行耗时（ms） */
	durationMs: number
	/** 重试次数 */
	retries: number
	/** 是否命中缓存 */
	cached: boolean
	/** 错误信息 */
	error?: string
}

/**
 * 工具指标
 */
export interface ToolMetrics {
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
	/** 重试次数（累计） */
	retryCount: number
}

/**
 * 会话指标
 * 存储在 session 根目录的 metrics.json
 */
export interface SessionMetrics {
	/** 按工具名称聚合的指标 */
	tools: Record<string, ToolMetrics>
}

/**
 * 指标快照
 * 每次指标变化后通过回调推送
 */
export type MetricsSnapshot = SessionMetrics

/**
 * 权限配置
 * 对应项目根目录的 permission.json
 */
export interface PermissionConfig {
	/** 允许的工具名模式列表，默认 ["*"] */
	allow?: string[]
	/** 需确认的工具名模式列表，默认 [] */
	check?: string[]
	/** 拒绝的工具名模式列表，默认 [] */
	deny?: string[]
}
