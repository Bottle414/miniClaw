import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { createRuntime } from "@mini-claw/runtime"
import { loadPermissionConfig } from "@mini-claw/runtime"
import type { Runtime, MetricsSnapshot, ToolMetrics, LLMProviderType } from "@mini-claw/runtime"

import { serializeEvent } from "../utils/index.js"
import { buildUserPrompt, buildSoulPrompt } from "./user-config.js"
import type { UserConfig } from "./user-config.js"

/** Chat 请求参数 */
export interface ChatParams {
	message: string
	sessionId?: string
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
	const permissionConfig = runtimeConfig.projectRoot ? loadPermissionConfig(runtimeConfig.projectRoot) : undefined
	const runtimeCache = new Map<string, Runtime>()

	function getRuntimeForSession(sessionId: string, userConfig?: UserConfig): Runtime {
		const cached = runtimeCache.get(sessionId)
		if (cached) return cached

		const onMetricsUpdate = createMetricsWriter(runtimeConfig.sessionsRoot, sessionId)
		const userPrompt = userConfig ? buildUserPrompt(userConfig) : undefined
		const soulPrompt = userConfig ? buildSoulPrompt(userConfig) : undefined
		const runtime = createRuntime({ ...runtimeConfig, sessionId, permissionConfig, onMetricsUpdate, userPrompt, soulPrompt })
		runtimeCache.set(sessionId, runtime)
		return runtime
	}

	return {
		async *chat(params: ChatParams): AsyncIterable<SSEEvent> {
			const { message, sessionId } = params

			// 读取用户配置，注入 userPrompt 和 soulPrompt
			let userConfig: UserConfig | undefined
			if (getUserConfig) {
				try {
					userConfig = await getUserConfig()
				} catch {
					// 读取失败时使用默认配置
				}
			}

			const runtime = sessionId
				? getRuntimeForSession(sessionId, userConfig)
				: createRuntime({
						...runtimeConfig,
						permissionConfig,
						userPrompt: userConfig ? buildUserPrompt(userConfig) : undefined,
						soulPrompt: userConfig ? buildSoulPrompt(userConfig) : undefined
					})

			try {
				for await (const event of runtime.chat(message, {
					contextOptions: { preserveRecentMessages: 2 }
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
