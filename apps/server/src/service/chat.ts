import { createRuntime } from "@mini-claw/runtime"
import type { Runtime, RuntimeEvent } from "@mini-claw/runtime"

import { serializeEvent } from "../utils/index.js"

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

/** 初始化 chatService，返回 chat 方法 */
export function initChatService(runtimeConfig: { apiKey: string; baseUrl?: string; model?: string; sessionsRoot: string }) {
	const runtimeCache = new Map<string, Runtime>()

	function getRuntimeForSession(sessionId: string): Runtime {
		const cached = runtimeCache.get(sessionId)
		if (cached) return cached

		const runtime = createRuntime({ ...runtimeConfig, sessionId })
		runtimeCache.set(sessionId, runtime)
		return runtime
	}

	return {
		async *chat(params: ChatParams): AsyncIterable<SSEEvent> {
			const { message, sessionId } = params
			const runtime = sessionId ? getRuntimeForSession(sessionId) : createRuntime(runtimeConfig)

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
