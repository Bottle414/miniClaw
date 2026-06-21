import type { ToolMiddleware, ToolResult, MetricsSnapshot, ToolMetrics } from "../../types/llm/tool"

/**
 * 创建指标采集中间件
 * 仅负责运行时聚合，通过回调向调用方推送指标快照
 */
export function createMetricsMiddleware(onMetricsUpdate?: (snapshot: MetricsSnapshot) => void): ToolMiddleware {
	const metricsMap = new Map<string, ToolMetrics>()

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

		if (onMetricsUpdate) {
			const snapshot: MetricsSnapshot = { tools: Object.fromEntries(metricsMap) }
			onMetricsUpdate(snapshot)
		}

		return result
	}
}
