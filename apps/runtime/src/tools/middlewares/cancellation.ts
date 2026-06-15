import type { ToolMiddleware, ToolResult } from "../../types/llm/tool"

/**
 * 创建取消检查中间件
 * 执行前检查 AbortSignal，已取消则拒绝
 * 执行中将 signal 传递给下游（由 timeout middleware 合并）
 */
export function createCancellationMiddleware(): ToolMiddleware {
	return async (context, next) => {
		if (context.abortSignal?.aborted) {
			return {
				content: "",
				error: { code: "CANCELLED", message: "Tool call cancelled" }
			}
		}

		return next()
	}
}
