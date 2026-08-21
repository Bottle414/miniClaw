import path from "node:path"
import type { LLMTool } from "../types/llm"
import type {
	ToolExecutor,
	ToolMetadata,
	ToolResult,
	ToolMiddleware,
	MiddlewareContext,
	MiddlewareRuntimeState,
	PermissionConfig,
	MetricsSnapshot
} from "../types/llm/tool"
import { composeMiddlewareChain } from "./middlewares/compose"
import { createPermissionMiddleware } from "./middlewares/permission"
import { createCancellationMiddleware } from "./middlewares/cancellation"
import { createCacheMiddleware } from "./middlewares/cache"
import { createMetricsMiddleware } from "./middlewares/metrics"
import { createLoggingMiddleware } from "./middlewares/logging"
import { createRetryMiddleware } from "./middlewares/retry"
import { createTimeoutMiddleware } from "./middlewares/timeout"
import { weatherGetWeather } from "./weather"
import { timeGetCurrent } from "./time"
import { fsReadFile } from "./fs"
import { mathCalculate } from "./math"

/** 工具注册项 */
interface ToolEntry {
	definition: LLMTool
	executor: ToolExecutor
	metadata?: ToolMetadata
}

/** 默认 metadata */
const defaultMetadata: ToolMetadata = {
	retryable: true,
	maxRetries: 0,
	timeoutMs: 30000,
	cacheable: false,
	dangerous: false
}

/** 工具处理器配置 */
interface ToolHandlerOptions {
	/** 权限配置 */
	permissionConfig?: PermissionConfig
	/** 权限确认回调 */
	onPermissionCheck?: (toolName: string) => Promise<boolean>
	/** 指标更新回调 */
	onMetricsUpdate?: (snapshot: MetricsSnapshot) => void
	/** session 根目录（用于 logging middleware） */
	sessionsRoot?: string
}

/** 工具处理器类型 */
export type ToolHandler = ReturnType<typeof createToolHandler>

/**
 * 创建工具处理器
 * 统一注册和调用工具，支持中间件链
 */
export function createToolHandler(options?: ToolHandlerOptions) {
	const tools = new Map<string, ToolEntry>()

	const { permissionConfig, onPermissionCheck = async () => true, onMetricsUpdate, sessionsRoot } = options ?? {}

	// 默认中间件链：permission → cancellation → metrics → cache → logging → retry → timeout
	// metrics 在 cache 之前，确保缓存命中时 metrics 仍可记录
	const effectiveMiddlewares: ToolMiddleware[] = [
		createPermissionMiddleware(permissionConfig ?? { allow: ["*"] }, onPermissionCheck),
		createCancellationMiddleware(),
		createMetricsMiddleware(onMetricsUpdate),
		createCacheMiddleware(),
		createLoggingMiddleware(sessionsRoot ?? path.join(process.cwd(), ".sessions")),
		createRetryMiddleware(),
		createTimeoutMiddleware()
	]

	/** 注册工具 */
	function register(definition: LLMTool, executor: ToolExecutor, metadata?: ToolMetadata): void {
		tools.set(definition.name, {
			definition,
			executor,
			metadata: metadata ?? defaultMetadata
		})
	}

	/** 获取所有工具定义 (LLMTool 格式) */
	function getToolDefinitions(): LLMTool[] {
		return Array.from(tools.values()).map((entry) => entry.definition)
	}

	/** 通过工具名获取工具 */
	function get(name: string): ToolEntry | undefined {
		return tools.get(name)
	}

	/** 设置/更新工具 */
	function set(definition: LLMTool, executor: ToolExecutor, metadata?: ToolMetadata): void {
		tools.set(definition.name, {
			definition,
			executor,
			metadata: metadata ?? defaultMetadata
		})
	}

	/** 调用工具 */
	async function call(name: string, params: Record<string, unknown>, sessionId?: string, signal?: AbortSignal): Promise<ToolResult> {
		const entry = tools.get(name)
		if (!entry) {
			return {
				content: "",
				error: { code: "NOT_FOUND", message: `Tool not found: ${name}` }
			}
		}

		const runtime: MiddlewareRuntimeState = {
			startedAt: Date.now()
		}

		const context: MiddlewareContext = {
			toolName: name,
			params,
			metadata: entry.metadata ?? defaultMetadata,
			sessionId: sessionId ?? "",
			abortSignal: signal,
			runtime
		}

		return composeMiddlewareChain(effectiveMiddlewares, context, () => entry.executor(params, { abortSignal: context.abortSignal }))
	}

	/** 是否已注册 */
	function has(name: string): boolean {
		return tools.has(name)
	}

	return {
		register,
		getToolDefinitions,
		get,
		set,
		call,
		has
	}
}

// 工具注册由 createRuntime 中的实例完成
