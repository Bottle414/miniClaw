import type { RuntimeEvent } from "@mini-claw/runtime"

/**
 * 将 LLMMessage[] 转为前端 ChatMessage 格式
 * 过滤掉 system 和 tool 消息，只保留 user/assistant
 */
export function convertMessages(messages: Array<{ role: string; content: string | null }>): Array<{ role: string; content: string }> {
	const result: Array<{ role: string; content: string }> = []
	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i]
		if (msg.role === "system" || msg.role === "tool") continue
		const content = msg.content ?? ""
		if (!content) continue
		result.push({ role: msg.role, content })
	}

	console.log("id------------------------>", result)
	return result
}

/**
 * 序列化 RuntimeEvent 为 SSE 可传输的 JSON
 * Error 对象需转为 plain object
 */
export function serializeEvent(event: RuntimeEvent): string {
	if (event.type === "error") {
		const { type, error } = event
		return JSON.stringify({
			type,
			error: { message: error.message, stack: error.stack ?? "" }
		})
	}
	return JSON.stringify(event)
}
