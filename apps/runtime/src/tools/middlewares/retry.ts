import type { ToolMiddleware, ToolResult } from "../../types/llm/tool"

/**
 * 创建重试中间件
 * 指数退避重试，基于 retryable metadata 判断，不基于 category
 */
export function createRetryMiddleware(defaultMaxRetries = 0): ToolMiddleware {
	return async (context, next) => {
		const { metadata, runtime } = context
		const retryable = metadata.retryable ?? true
		const maxRetries = metadata.maxRetries ?? defaultMaxRetries
		const baseDelay = metadata.retryBaseDelay ?? 1000

		let lastResult = await next()

		if (!retryable || maxRetries <= 0) {
			return lastResult
		}

		let attempts = 0
		while (lastResult.error && attempts < maxRetries) {
			attempts++
			runtime.retryCount = attempts
			const delay = baseDelay * Math.pow(2, attempts - 1)
			await new Promise((resolve) => setTimeout(resolve, delay))
			lastResult = await next()
		}

		return lastResult
	}
}
