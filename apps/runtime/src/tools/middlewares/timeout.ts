import type { ToolMiddleware, ToolResult } from "../../types/llm/tool"
import { anySignal } from "../../utils/signal"

/**
 * 创建超时截断中间件
 * 使用 Promise.race + AbortController 真正中断执行
 * 创建 child AbortController，合并 parent signal 与 timeout signal
 * 就地修改 context.abortSignal 为 merged signal，传递给下游
 */
export function createTimeoutMiddleware(defaultTimeoutMs = 30000): ToolMiddleware {
	return async (context, next) => {
		const timeoutMs = context.metadata.timeoutMs ?? defaultTimeoutMs
		const timeoutController = new AbortController()

		// 合并 parent signal 与 timeout signal
		const originalSignal = context.abortSignal
		const mergedSignal = anySignal([originalSignal, timeoutController.signal])

		// 就地修改 context，将 merged signal 传递给下游
		context.abortSignal = mergedSignal

		const timeoutPromise = new Promise<ToolResult>((_resolve, reject) => {
			const timer = setTimeout(() => {
				timeoutController.abort()
				context.runtime.timeoutTriggered = true
				reject(new ToolTimeoutError(timeoutMs))
			}, timeoutMs)

			// parent signal 已 abort 时清除 timer
			originalSignal?.addEventListener("abort", () => clearTimeout(timer), { once: true })
		})

		try {
			return await Promise.race([next(), timeoutPromise])
		} catch (err) {
			if (err instanceof ToolTimeoutError) {
				return {
					content: "",
					error: { code: "TIMEOUT", message: `Execution exceeded ${err.timeoutMs}ms` }
				}
			}
			throw err
		}
	}
}

/**
 * 工具超时错误
 */
export class ToolTimeoutError extends Error {
	constructor(public readonly timeoutMs: number) {
		super(`Tool execution exceeded ${timeoutMs}ms`)
		this.name = "ToolTimeoutError"
	}
}
