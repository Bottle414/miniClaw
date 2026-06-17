/**
 * useChat hook
 *
 * 管理消息状态、SSE 连接、消息合并、发送消息
 */

import { useCallback, useState } from "react"

import type { ChatMessage } from "../types/message"
import { createUserMessage, processEvent } from "../lib/message-merger"
import { streamChat } from "../lib/sse-client"

export function useChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [isStreaming, setIsStreaming] = useState(false)

	const sendMessage = useCallback(async (content: string) => {
		// 添加用户消息
		const userMsg = createUserMessage(content)
		setMessages((prev) => [...prev, userMsg])
		setIsStreaming(true)

		try {
			for await (const event of streamChat(content)) {
				setMessages((prev) => processEvent(prev, event))
			}
		} catch (err) {
			const errorMsg: ChatMessage = {
				id: `error-${Date.now()}`,
				role: "assistant",
				content: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
				segments: [{ type: "text", content: `Connection error: ${err instanceof Error ? err.message : String(err)}` }],
				isComplete: true
			}
			setMessages((prev) => [...prev, errorMsg])
		} finally {
			setIsStreaming(false)
		}
	}, [])

	return { messages, isStreaming, sendMessage }
}
