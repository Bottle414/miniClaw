import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { createRuntime } from "@mini-claw/runtime"
import { loadPermissionConfig } from "@mini-claw/runtime"
import type { Runtime, MetricsSnapshot, ToolMetrics, LLMProviderType, PermissionConfig } from "@mini-claw/runtime"

import { serializeEvent } from "../utils/index.js"
import { buildUserPrompt, buildSoulPrompt } from "./user-config.js"
import type { UserConfig } from "./user-config.js"

/** 根据 model 名称推断 provider 类型 */
function inferProvider(model: string): LLMProviderType {
	if (model.startsWith("glm")) return "glm"
	return "deepseek"
}

/** 根据 provider 类型从 userConfig 取对应 API Key，未配置则返回空 */
function resolveApiKey(provider: LLMProviderType, userConfig?: UserConfig): string {
	if (provider === "glm") {
		return userConfig?.glmApiKey || ""
	}
	return userConfig?.deepseekApiKey || ""
}

/** Chat 请求参数 */
export interface ChatParams {
	message: string
	sessionId?: string
	/** 外部中断信号，由 controller 透传，用于中断 runtime 调用链 */
	signal?: AbortSignal
}

/** SSE 事件数据 */
export interface SSEEvent {
	event: string
	data: string
}

/**
 * 将指标快照与已有 metrics.json 合并后写入
 * 合并策略：同一工具取新快照的值（累积指标），不同工具保留已有数据
 */
async function mergeAndWriteMetrics(metricsPath: string, snapshot: MetricsSnapshot): Promise<void> {
	try {
		let existing: Record<string, ToolMetrics> = {}
		try {
			const content = await readFile(metricsPath, "utf-8")
			const parsed = JSON.parse(content) as MetricsSnapshot
			if (parsed.tools) existing = parsed.tools
		} catch {
			// 文件不存在或解析失败，使用空对象
		}

		const merged: MetricsSnapshot = {
			tools: { ...existing, ...snapshot.tools }
		}
		await writeFile(metricsPath, JSON.stringify(merged, null, 2), "utf-8")
	} catch {
		// 写入失败静默忽略
	}
}

/**
 * 创建 onMetricsUpdate 回调
 * 每次工具调用后，立即将最新指标快照与已有 metrics.json 合并后写入
 * 不使用防抖，因为工具调用是串行的，且需要确保数据不丢失
 */
function createMetricsWriter(sessionsRoot: string, sessionId: string): (snapshot: MetricsSnapshot) => void {
	const metricsPath = path.join(sessionsRoot, sessionId, "metrics.json")

	return (snapshot: MetricsSnapshot) => {
		// 不 await，fire-and-forget，避免阻塞工具调用链
		mergeAndWriteMetrics(metricsPath, snapshot).catch(() => {})
	}
}

/** 初始化 chatService，返回 chat 方法 */
export function initChatService(
	runtimeConfig: { apiKey: string; provider?: LLMProviderType; baseUrl?: string; model?: string; sessionsRoot: string; projectRoot?: string },
	getUserConfig?: () => Promise<UserConfig>
) {
	// 缓存 key = sessionId:model，模型切换后创建新 runtime
	const runtimeCache = new Map<string, { runtime: Runtime; permissionHash: string }>()

	function getRuntimeForSession(sessionId: string, userConfig?: UserConfig, permissionConfig?: PermissionConfig): Runtime {
		const model = userConfig?.model || runtimeConfig.model || "deepseek-v4-flash"
		const cacheKey = `${sessionId}:${model}`
		const permissionHash = JSON.stringify(permissionConfig)

		const cached = runtimeCache.get(cacheKey)
		if (cached && cached.permissionHash === permissionHash) return cached.runtime

		const provider = inferProvider(model)
		const apiKey = resolveApiKey(provider, userConfig)
		const onMetricsUpdate = createMetricsWriter(runtimeConfig.sessionsRoot, sessionId)
		const userPrompt = userConfig ? buildUserPrompt(userConfig) : undefined
		const soulPrompt = userConfig ? buildSoulPrompt(userConfig) : undefined
		const runtime = createRuntime({ ...runtimeConfig, apiKey, provider, model, sessionId, permissionConfig, onMetricsUpdate, userPrompt, soulPrompt })
		runtimeCache.set(cacheKey, { runtime, permissionHash })
		return runtime
	}

	return {
		async *chat(params: ChatParams): AsyncIterable<SSEEvent> {
			const { message, sessionId, signal } = params

			// 读取用户配置，注入 userPrompt 和 soulPrompt
			let userConfig: UserConfig | undefined
			if (getUserConfig) {
				try {
					userConfig = await getUserConfig()
				} catch {
					// 读取失败时使用默认配置
				}
			}

			// 每次请求重新加载权限配置，确保 permission.json 修改后立即生效
			const permissionConfig = runtimeConfig.projectRoot ? loadPermissionConfig(runtimeConfig.projectRoot) : undefined

			const model = userConfig?.model || runtimeConfig.model || "deepseek-v4-flash"
			const provider = inferProvider(model)
			const apiKey = resolveApiKey(provider, userConfig)

			// API Key 未配置时直接返回错误
			if (!apiKey) {
				yield {
					event: "runtime-event",
					data: JSON.stringify({ type: "error", error: { message: "API Key 未配置，请在设置中配置 API Key", stack: "" } })
				}
				return
			}

			const runtime = sessionId
				? getRuntimeForSession(sessionId, userConfig, permissionConfig)
				: createRuntime({
						...runtimeConfig,
						apiKey,
						provider,
						model,
						permissionConfig,
						userPrompt: userConfig ? buildUserPrompt(userConfig) : undefined,
						soulPrompt: userConfig ? buildSoulPrompt(userConfig) : undefined
					})

			try {
				for await (const event of runtime.chat(message, {
					contextOptions: { preserveRecentMessages: 2 },
					signal
				})) {
					const data = serializeEvent(event)
					yield { event: "runtime-event", data }

					if (event.type === "loop-complete") {
						break
					}
				}
			} catch (err) {
				const errorData = JSON.stringify({
					type: "error",
					error: { message: err instanceof Error ? err.message : String(err), stack: "" }
				})
				yield { event: "runtime-event", data: errorData }
			}
		}
	}
}
