import { promises as fs } from "node:fs"
import path from "node:path"

import type { ToolMiddleware, ToolResult, SessionMetrics, ToolMetrics } from "../../types/llm/tool"
import { logger } from "../../utils/logger"

/**
 * 创建指标采集中间件
 * 内存聚合 + 持久化到 session 根目录 metrics.json
 */
export function createMetricsMiddleware(sessionsRoot: string): ToolMiddleware {
	const metricsMap = new Map<string, ToolMetrics>()

	async function persistMetrics(sessionId: string): Promise<void> {
		if (!sessionId) return
		const filePath = path.join(sessionsRoot, sessionId, "metrics.json")
		const data: SessionMetrics = { tools: Object.fromEntries(metricsMap) }
		try {
			await fs.mkdir(path.dirname(filePath), { recursive: true })
			await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
		} catch (err) {
			logger("tool", "red", "[Metrics] Failed to persist", [err instanceof Error ? err.message : String(err)])
		}
	}

	return async (context, next) => {
		const { toolName, runtime } = context
		const startedAt = runtime.startedAt ?? Date.now()

		const result = await next()

		const finishedAt = Date.now()
		const durationMs = finishedAt - startedAt

		let metrics = metricsMap.get(toolName)
		if (!metrics) {
			metrics = {
				callCount: 0,
				errorCount: 0,
				totalDurationMs: 0,
				avgDurationMs: 0,
				lastCalledAt: "",
				cacheHits: 0,
				cacheMisses: 0,
				timeoutCount: 0,
				retryCount: 0
			}
			metricsMap.set(toolName, metrics)
		}

		metrics.callCount++
		metrics.totalDurationMs += durationMs
		metrics.avgDurationMs = Math.round(metrics.totalDurationMs / metrics.callCount)
		metrics.lastCalledAt = new Date(finishedAt).toISOString()

		if (result.error) {
			metrics.errorCount++
		}

		if (runtime.cacheHit === true) {
			metrics.cacheHits++
		} else if (context.metadata.cacheable) {
			metrics.cacheMisses++
		}

		if (runtime.timeoutTriggered === true) {
			metrics.timeoutCount++
		}

		if (runtime.retryCount && runtime.retryCount > 0) {
			metrics.retryCount += runtime.retryCount
		}

		await persistMetrics(context.sessionId)

		return result
	}
}
