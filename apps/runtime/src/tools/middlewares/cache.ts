import type { ToolMiddleware, ToolResult } from "../../types/llm/tool"
import { stableStringify } from "../../utils/stable-stringify"

/**
 * 创建缓存中间件
 * session 生命周期内的 in-memory Map 缓存
 */
export function createCacheMiddleware(): ToolMiddleware {
	const cache = new Map<string, ToolResult>()

	return async (context, next) => {
		if (!context.metadata.cacheable) {
			return next()
		}

		const cacheKeyFn = context.metadata.cacheKeyFn
		const key = cacheKeyFn
			? cacheKeyFn(context.params)
			: `${context.toolName}:${stableStringify(context.params)}`

		const cached = cache.get(key)
		if (cached) {
			context.runtime.cacheHit = true
			return cached
		}

		const result = await next()

		// 仅缓存成功结果
		if (!result.error) {
			cache.set(key, result)
		}

		return result
	}
}
