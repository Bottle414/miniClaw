/**
 * SSE 客户端
 *
 * 封装 fetch-based SSE 连接，发送 POST 请求到 /api/chat，
 * 解析 SSE 事件流，yield RuntimeEvent 对象
 */

/** SSE 传输的 RuntimeEvent 类型（Error 已被序列化为 plain object） */
export interface SSEErrorEvent {
	type: "error"
	error: { message: string; stack: string }
}

export type SSERuntimeEvent =
	| { type: string; [key: string]: unknown }
	| SSEErrorEvent

/**
 * 发送聊天消息并消费 SSE 事件流
 *
 * 通过 fetch POST 连接 /api/chat，解析 SSE 文本流，
 * 逐事件 yield 给调用方
 */
export async function* streamChat(message: string): AsyncGenerator<SSERuntimeEvent> {
	const response = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ message })
	})

	if (!response.ok) {
		const text = await response.text()
		yield { type: "error", error: { message: `HTTP ${response.status}: ${text}`, stack: "" } }
		return
	}

	const reader = response.body?.getReader()
	if (!reader) {
		yield { type: "error", error: { message: "No response body", stack: "" } }
		return
	}

	const decoder = new TextDecoder()
	let buffer = ""

	try {
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })

			// 解析 SSE 格式：event: xxx\ndata: xxx\n\n
			const parts = buffer.split("\n\n")
			// 最后一段可能不完整，保留在 buffer
			buffer = parts.pop() ?? ""

			for (const part of parts) {
				const event = parseSSEBlock(part)
				if (event) yield event
			}
		}

		// 处理 buffer 中剩余内容
		if (buffer.trim()) {
			const event = parseSSEBlock(buffer)
			if (event) yield event
		}
	} finally {
		reader.releaseLock()
	}
}

/** 解析单个 SSE 块（event: xxx\ndata: xxx） */
function parseSSEBlock(block: string): SSERuntimeEvent | null {
	const lines = block.split("\n")
	let dataLine = ""

	for (const line of lines) {
		if (line.startsWith("data: ")) {
			dataLine = line.slice(6)
		}
	}

	if (!dataLine) return null

	try {
		return JSON.parse(dataLine) as SSERuntimeEvent
	} catch {
		return { type: "error", error: { message: `Failed to parse SSE data: ${dataLine}`, stack: "" } }
	}
}
