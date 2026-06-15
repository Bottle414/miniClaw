import { promises as fs } from "node:fs"
import path from "node:path"

import type { ToolMiddleware, ToolResult, ToolExecutionRecord } from "../../types/llm/tool"
import { logger } from "../../utils/logger"

/**
 * 创建日志中间件
 * 记录完整 tool call 生命周期，写入 tool-runs.json
 */
export function createLoggingMiddleware(sessionsRoot: string): ToolMiddleware {
	return async (context, next) => {
		const { toolName, params, runtime } = context
		const startedAt = runtime.startedAt ?? Date.now()

		logger("tool", "cyan", `[Tool Call Start] ${toolName}`, [params])

		const result = await next()

		const finishedAt = Date.now()
		const durationMs = finishedAt - startedAt
		const { retryCount, cacheHit, timeoutTriggered } = runtime

		const status = result.error ? `error: ${result.error.code} - ${result.error.message}` : "success"
		const summary = result.content.slice(0, 200)

		logger("tool", "cyan", `[Tool Call End] ${toolName} ${status} ${durationMs}ms`, [
			{ durationMs, retryCount, cacheHit, timeoutTriggered, summary }
		])

		// 写入 tool-runs.json
		if (context.sessionId) {
			const record: ToolExecutionRecord = {
				toolName,
				startedAt: new Date(startedAt).toISOString(),
				finishedAt: new Date(finishedAt).toISOString(),
				durationMs,
				retries: retryCount ?? 0,
				cached: cacheHit ?? false,
				error: result.error?.message
			}
			const filePath = path.join(sessionsRoot, context.sessionId, "tool-runs.json")
			try {
				await fs.mkdir(path.dirname(filePath), { recursive: true })
				let records: ToolExecutionRecord[] = []
				try {
					const existing = await fs.readFile(filePath, "utf-8")
					records = JSON.parse(existing)
				} catch {
					// 文件不存在，创建新文件
				}
				records.push(record)
				await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf-8")
			} catch (err) {
				logger("tool", "red", "[Logging] Failed to write tool-runs.json", [err instanceof Error ? err.message : String(err)])
			}
		}

		return result
	}
}
