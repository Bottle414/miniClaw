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

			// parent signal abort 时立即取消：
			// - 清 timer：避免后续误触发超时（语义是用户取消，不是超时）
			// - abort timeoutController：让 mergedSignal 也 abort，下游用 signal 的 executor 会立即抛 AbortError
			// - reject ToolCancelledError：让没用 signal 的 executor 通过 Promise.race 也能立即返回
			const onParentAbort = () => {
				clearTimeout(timer)
				timeoutController.abort()
				reject(new ToolCancelledError())
			}
			// parent 进入时已 abort：立即触发，避免错过事件
			if (originalSignal?.aborted) {
				onParentAbort()
				return
			}
			originalSignal?.addEventListener("abort", onParentAbort, { once: true })
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
			// 用户主动取消：ToolCancelledError（本中间件 reject）或 AbortError（executor 用 signal 但没自己 catch）
			if (err instanceof ToolCancelledError || (err instanceof Error && err.name === "AbortError")) {
				return {
					content: "",
					error: { code: "CANCELLED", message: "Tool call cancelled" }
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

/**
 * 工具取消错误（parent signal abort 时抛出，区别于超时）
 */
export class ToolCancelledError extends Error {
	constructor() {
		super("Tool call cancelled")
		this.name = "ToolCancelledError"
	}
}
