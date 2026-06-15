import type { ToolMiddleware, MiddlewareContext, ToolResult } from "../../types/llm/tool"

/**
 * 组合中间件为洋葱模型链（带 context 传递）
 * middlewares[0] 最外层，middlewares[n-1] 最内层（紧贴 executor）
 */
export function composeMiddlewareChain(
	middlewares: ToolMiddleware[],
	context: MiddlewareContext,
	executor: () => Promise<ToolResult>
): Promise<ToolResult> {
	let index = 0

	async function dispatch(): Promise<ToolResult> {
		if (index < middlewares.length) {
			const middleware = middlewares[index++]
			return middleware(context, dispatch)
		}
		return executor()
	}

	return dispatch()
}
