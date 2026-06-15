import type { LLMTool } from "../types/llm"
import type { ToolExecutor, ToolMetadata, ToolResult, ToolMiddleware, MiddlewareContext, MiddlewareRuntimeState } from "../types/llm/tool"
import path from "node:path"
import { composeMiddlewareChain } from "./middlewares/compose"
import { createPermissionMiddleware } from "./middlewares/permission"
import { createCancellationMiddleware } from "./middlewares/cancellation"
import { createCacheMiddleware } from "./middlewares/cache"
import { createMetricsMiddleware } from "./middlewares/metrics"
import { createLoggingMiddleware } from "./middlewares/logging"
import { createRetryMiddleware } from "./middlewares/retry"
import { createTimeoutMiddleware } from "./middlewares/timeout"
import { weatherGetWeather } from "./weather"

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

/**
 * 创建工具处理器
 * 统一注册和调用工具，支持中间件链
 */
export function createToolHandler(middlewares?: ToolMiddleware[], sessionsRoot?: string) {
	const tools = new Map<string, ToolEntry>()
	const permissions = new Set<string>()

	// 默认中间件链：permission → cancellation → cache → metrics → logging → retry → timeout
	const effectiveMiddlewares = middlewares ?? [
		createPermissionMiddleware(() => permissions),
		createCancellationMiddleware(),
		createCacheMiddleware(),
		createMetricsMiddleware(sessionsRoot ?? path.join(process.cwd(), ".sessions")),
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
	async function call(name: string, params: Record<string, unknown>, sessionId?: string): Promise<ToolResult> {
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
			runtime
		}

		return composeMiddlewareChain(effectiveMiddlewares, context, () => entry.executor(params, { abortSignal: context.abortSignal }))
	}

	/** 是否已注册 */
	function has(name: string): boolean {
		return tools.has(name)
	}

	/** 添加权限 */
	function addPermission(perm: string): void {
		permissions.add(perm)
	}

	return {
		register,
		getToolDefinitions,
		get,
		set,
		call,
		has,
		addPermission
	}
}

/** 全局工具处理器实例 */
export const toolHandler = createToolHandler(undefined, process.env.SESSIONS_ROOT || path.join(process.cwd(), ".sessions"))

// ============== 注册工具 ==============

toolHandler.register(weatherGetWeather.definition, weatherGetWeather.executor, weatherGetWeather.metadata)
